<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

const props = withDefaults(defineProps<{
  raysOrigin?: 'top-center' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-center' | 'bottom-left' | 'bottom-right'
  raysColor?: string
  raysSpeed?: number
  lightSpread?: number
  rayLength?: number
  followMouse?: boolean
  mouseInfluence?: number
  noiseAmount?: number
  distortion?: number
  pulsating?: boolean
  fadeDistance?: number
  saturation?: number
}>(), {
  raysOrigin: 'top-center',
  raysColor: '#ffffff',
  raysSpeed: 1,
  lightSpread: 0.5,
  rayLength: 3,
  followMouse: true,
  mouseInfluence: 0.1,
  noiseAmount: 0,
  distortion: 0,
  pulsating: false,
  fadeDistance: 1,
  saturation: 1,
})

const containerRef = ref<HTMLElement | null>(null)
const webglFailed = ref(false)

let renderer: Renderer | null = null
let program: Program | null = null
let geometry: Triangle | null = null
let mesh: Mesh | null = null
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let animationFrame = 0
let intersecting = true
let initialized = false
let reducedMotion = false
let mouseX = 0.5
let mouseY = 0.5
let smoothMouseX = 0.5
let smoothMouseY = 0.5
let lastRenderTime = 0

const FRAME_INTERVAL = 1000 / 30

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

const vertexShader = `
  attribute vec2 position;
  varying vec2 vUv;

  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`

const fragmentShader = `
  precision highp float;

  uniform float iTime;
  uniform vec2 iResolution;
  uniform vec2 rayPos;
  uniform vec2 rayDir;
  uniform vec3 raysColor;
  uniform float raysSpeed;
  uniform float lightSpread;
  uniform float rayLength;
  uniform float pulsating;
  uniform float fadeDistance;
  uniform float saturation;
  uniform vec2 mousePos;
  uniform float mouseInfluence;
  uniform float noiseAmount;
  uniform float distortion;
  varying vec2 vUv;

  float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float rayStrength(
    vec2 raySource,
    vec2 rayRefDirection,
    vec2 coord,
    float seedA,
    float seedB,
    float speed
  ) {
    vec2 sourceToCoord = coord - raySource;
    vec2 dirNorm = normalize(sourceToCoord);
    float cosAngle = dot(dirNorm, rayRefDirection);
    float distortedAngle = cosAngle
      + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
    float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));
    float distanceToSource = length(sourceToCoord);
    float maxDistance = iResolution.x * rayLength;
    float lengthFalloff = clamp((maxDistance - distanceToSource) / maxDistance, 0.0, 1.0);
    float fadeFalloff = clamp(
      (iResolution.x * fadeDistance - distanceToSource) / (iResolution.x * fadeDistance),
      0.5,
      1.0
    );
    float pulse = pulsating > 0.5 ? 0.8 + 0.2 * sin(iTime * speed * 3.0) : 1.0;
    float baseStrength = clamp(
      (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed))
        + (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
      0.0,
      1.0
    );
    return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
  }

  void main() {
    vec2 coord = vec2(gl_FragCoord.x, iResolution.y - gl_FragCoord.y);
    vec2 finalRayDir = rayDir;
    if (mouseInfluence > 0.0) {
      vec2 mouseScreenPos = mousePos * iResolution.xy;
      vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
      finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
    }

    vec4 rays1 = vec4(1.0) * rayStrength(
      rayPos, finalRayDir, coord, 36.2214, 21.11349, 1.5 * raysSpeed
    );
    vec4 rays2 = vec4(1.0) * rayStrength(
      rayPos, finalRayDir, coord, 22.3991, 18.0234, 1.1 * raysSpeed
    );
    vec4 color = rays1 * 0.5 + rays2 * 0.4;

    if (noiseAmount > 0.0) {
      float amount = noise(coord * 0.01 + iTime * 0.1);
      color.rgb *= 1.0 - noiseAmount + noiseAmount * amount;
    }

    float brightness = 1.0 - coord.y / iResolution.y;
    color.r *= 0.1 + brightness * 0.8;
    color.g *= 0.3 + brightness * 0.6;
    color.b *= 0.5 + brightness * 0.5;

    if (saturation != 1.0) {
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, saturation);
    }

    color.rgb *= raysColor;
    gl_FragColor = color;
  }
`

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return [1, 1, 1]
  return [
    Number.parseInt(match[1]!, 16) / 255,
    Number.parseInt(match[2]!, 16) / 255,
    Number.parseInt(match[3]!, 16) / 255,
  ]
}

function getAnchorAndDirection(origin: typeof props.raysOrigin, width: number, height: number) {
  const outside = 0.2
  switch (origin) {
    case 'top-left': return { anchor: [0, -outside * height], direction: [0, 1] }
    case 'top-right': return { anchor: [width, -outside * height], direction: [0, 1] }
    case 'left': return { anchor: [-outside * width, height * 0.5], direction: [1, 0] }
    case 'right': return { anchor: [(1 + outside) * width, height * 0.5], direction: [-1, 0] }
    case 'bottom-left': return { anchor: [0, (1 + outside) * height], direction: [0, -1] }
    case 'bottom-center': return { anchor: [width * 0.5, (1 + outside) * height], direction: [0, -1] }
    case 'bottom-right': return { anchor: [width, (1 + outside) * height], direction: [0, -1] }
    default: return { anchor: [width * 0.5, -outside * height], direction: [0, 1] }
  }
}

function resize() {
  const container = containerRef.value
  if (!container || !renderer || !program) return
  const width = Math.max(1, container.clientWidth)
  const height = Math.max(1, container.clientHeight)
  renderer.dpr = Math.min(window.devicePixelRatio, 1.25)
  renderer.setSize(width, height)
  const resolutionWidth = width * renderer.dpr
  const resolutionHeight = height * renderer.dpr
  const placement = getAnchorAndDirection(props.raysOrigin, resolutionWidth, resolutionHeight)
  program.uniforms.iResolution.value = [resolutionWidth, resolutionHeight]
  program.uniforms.rayPos.value = placement.anchor
  program.uniforms.rayDir.value = placement.direction
  renderOnce()
}

function renderOnce(time = performance.now()) {
  if (!renderer || !program || !mesh) return
  program.uniforms.iTime.value = reducedMotion ? 0 : time * 0.001
  if (!reducedMotion && props.followMouse) {
    smoothMouseX = smoothMouseX * 0.92 + mouseX * 0.08
    smoothMouseY = smoothMouseY * 0.92 + mouseY * 0.08
  }
  program.uniforms.mousePos.value = [smoothMouseX, smoothMouseY]
  renderer.render({ scene: mesh })
}

function animate(time: number) {
  animationFrame = 0
  if (!intersecting || document.hidden || reducedMotion) return
  if (time - lastRenderTime >= FRAME_INTERVAL) {
    lastRenderTime = time
    renderOnce(time)
  }
  animationFrame = requestAnimationFrame(animate)
}

function updateAnimationState() {
  if (!initialized) return
  if (intersecting && !document.hidden && !reducedMotion) {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate)
    return
  }
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  if (intersecting && !document.hidden) renderOnce()
}

function handlePointerMove(event: PointerEvent) {
  if (!props.followMouse || reducedMotion) return
  mouseX = event.clientX / Math.max(window.innerWidth, 1)
  mouseY = 1 - event.clientY / Math.max(window.innerHeight, 1)
}

function handleVisibilityChange() {
  updateAnimationState()
}

function handleMotionPreference(event: MediaQueryListEvent) {
  reducedMotion = event.matches
  updateAnimationState()
}

function handleContextLost(event: Event) {
  event.preventDefault()
  webglFailed.value = true
  intersecting = false
  updateAnimationState()
}

function initialize() {
  const container = containerRef.value
  if (!container) return
  try {
    reducedMotion = motionPreference.matches
    renderer = new Renderer({
      alpha: true,
      antialias: false,
      depth: false,
      dpr: Math.min(window.devicePixelRatio, 1.25),
    })
    const gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.canvas.className = 'light-rays-canvas'
    gl.canvas.setAttribute('aria-hidden', 'true')
    gl.canvas.addEventListener('webglcontextlost', handleContextLost)
    container.appendChild(gl.canvas)

    geometry = new Triangle(gl)
    program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        rayPos: { value: [0, 0] },
        rayDir: { value: [0, 1] },
        raysColor: { value: hexToRgb(props.raysColor) },
        raysSpeed: { value: props.raysSpeed },
        lightSpread: { value: props.lightSpread },
        rayLength: { value: props.rayLength },
        pulsating: { value: props.pulsating ? 1 : 0 },
        fadeDistance: { value: props.fadeDistance },
        saturation: { value: props.saturation },
        mousePos: { value: [0.5, 0.5] },
        mouseInfluence: { value: props.followMouse && !reducedMotion ? props.mouseInfluence : 0 },
        noiseAmount: { value: props.noiseAmount },
        distortion: { value: props.distortion },
      },
    })
    mesh = new Mesh(gl, { geometry, program })
    initialized = true

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    intersectionObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? true
      updateAnimationState()
    })
    intersectionObserver.observe(container)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    motionPreference.addEventListener('change', handleMotionPreference)
    resize()
    updateAnimationState()
  } catch (error) {
    console.warn('Light Rays background could not initialize.', error)
    webglFailed.value = true
  }
}

function dispose() {
  initialized = false
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  resizeObserver = null
  intersectionObserver = null
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pointermove', handlePointerMove)
  motionPreference.removeEventListener('change', handleMotionPreference)

  const canvas = renderer?.gl.canvas
  canvas?.removeEventListener('webglcontextlost', handleContextLost)
  geometry?.remove()
  program?.remove()
  const loseContext = renderer?.gl.getExtension('WEBGL_lose_context')
  loseContext?.loseContext()
  canvas?.remove()
  renderer = null
  program = null
  geometry = null
  mesh = null
}

onMounted(initialize)
onBeforeUnmount(dispose)
</script>

<template>
  <div ref="containerRef" class="light-rays-background" :class="{ fallback: webglFailed }" />
</template>

<style scoped>
.light-rays-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #000;
  pointer-events: none;
}

.light-rays-background :deep(.light-rays-canvas) {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0.48;
}

.light-rays-background.fallback :deep(canvas) {
  display: none;
}
</style>
