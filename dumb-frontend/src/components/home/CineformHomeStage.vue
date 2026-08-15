<script setup lang="ts">
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import type { FeaturedCategory, FeaturedContent } from './featuredContent'

interface Props {
  content: FeaturedContent | null
}

interface Palette {
  primary: string
  accent: string
  background: string
}

interface SleeveTextures {
  front: THREE.Texture
  back: THREE.Texture
  borderColor: THREE.Color
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'progress', progress: number, phase: string): void
  (e: 'ready'): void
  (e: 'error', message: string): void
  (e: 'open', route: string): void
}>()

const CHARACTER_URL = '/cineform/models/scifi-girl-v01-optimized.glb'
const GALLERY_URL = '/cineform/models/modern-vr-art-gallery-pyramid-optimized.glb'
const ENVIRONMENT_URL = '/cineform/textures/studio-fashion.hdr'
const EXHIBIT_LAYER = 1
const GALLERY_LAYER = 2
const CAMERA_CYCLE_SECONDS = 42
const SLEEVE_ROTATION_SECONDS = 26
const SLEEVE_SIZE = 0.74
const SLEEVE_DEPTH = 0.026
const FLOOR_Y = -1.145

const palettes: Record<FeaturedCategory, Palette> = {
  MUSIC: { primary: '#ecf4ef', accent: '#9ed8d1', background: '#060b0d' },
  ANIME: { primary: '#fff1ed', accent: '#ff5a43', background: '#0d0808' },
  MOVIE: { primary: '#fff1db', accent: '#8a78ff', background: '#09090c' },
}

const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const displayContent = ref<FeaturedContent | null>(props.content)
const hitAreaStyle = ref<Record<string, string>>({ opacity: '0' })
const infoStyle = ref<Record<string, string>>({ opacity: '0' })
const sceneReady = ref(false)
const compactMode = ref(false)
const isHovered = ref(false)
const isFocused = ref(false)
const mobileInfoVisible = ref(false)

const infoVisible = computed(() => Boolean(
  displayContent.value && (isHovered.value || isFocused.value || mobileInfoVisible.value),
))

let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let exhibitRoot: THREE.Group | null = null
let sleevePivot: THREE.Group | null = null
let collisionMesh: THREE.Mesh | null = null
let activeFrontMaterial: THREE.MeshBasicMaterial | null = null
let activeBackMaterial: THREE.MeshBasicMaterial | null = null
let pendingFrontMaterial: THREE.MeshBasicMaterial | null = null
let pendingBackMaterial: THREE.MeshBasicMaterial | null = null
let sleeveEdgeMaterial: THREE.MeshStandardMaterial | null = null
let keyLight: THREE.SpotLight | null = null
let accentLight: THREE.PointLight | null = null
let exhibitLight: THREE.RectAreaLight | null = null
let characterLight: THREE.SpotLight | null = null
let dust: THREE.Points | null = null
let galleryRoot: THREE.Group | null = null
let characterRoot: THREE.Group | null = null
let floorReflector: Reflector | null = null
let environmentTexture: THREE.Texture | null = null
let activeFrontTexture: THREE.Texture | null = null
let activeBackTexture: THREE.Texture | null = null
let pendingFrontTexture: THREE.Texture | null = null
let pendingBackTexture: THREE.Texture | null = null
const activeBorderColor = new THREE.Color(palettes.MUSIC.accent)
let pendingBorderColor: THREE.Color | null = null
let textureTransitionStart = 0
let animationFrame = 0
let elapsedTime = 0
let rotationSpeed = 0
let previousFrame = performance.now()
let componentActive = true
let initialized = false
let disposed = false
let contentLoadToken = 0
let resizeObserver: ResizeObserver | null = null
let abortController: AbortController | null = null
let contentAbortController: AbortController | null = null
let hoverClearTimer: number | null = null
let infoHoverLock = false

const pointer = new THREE.Vector2()
const pointerTarget = new THREE.Vector2()
const rayPointer = new THREE.Vector2()
const raycaster = new THREE.Raycaster()
const cameraPosition = new THREE.Vector3()
const cameraTarget = new THREE.Vector3()
const projectionPoint = new THREE.Vector3()
const cameraWidePosition = new THREE.Vector3(0.35, 0.72, 7.92)
const cameraNearPosition = new THREE.Vector3(0.55, 0.76, 7.58)
const cameraRightPosition = new THREE.Vector3(0.8, 0.72, 7.76)
const cameraWideTarget = new THREE.Vector3(1.32, 0.22, 1.2)
const cameraNearTarget = new THREE.Vector3(1.32, 0.26, 1.04)
const cameraRightTarget = new THREE.Vector3(1.36, 0.23, 1.12)
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
let reduceMotion = motionPreference.matches

const progressWeights = new Map<string, number>()
const progressValues = new Map<string, number>()
const disposedTextures = new WeakSet<THREE.Texture>()

const cinematicShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.2 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    varying vec2 vUv;
    void main() {
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      vec2 focusUv = (vUv - vec2(0.5, 0.52)) * vec2(0.88, 1.08);
      float focusLight = 1.0 - smoothstep(0.16, 0.52, length(focusUv));
      color *= mix(0.76, 1.02, focusLight);
      float edge = smoothstep(0.42, 0.82, length((vUv - 0.5) * vec2(0.9, 1.0)));
      color *= 1.0 - edge * uVignette;
      color = mix(color, color * vec3(0.98, 1.0, 1.012), 0.08);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

const reflectionShader = {
  name: 'DumbFloorReflection',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    uOpacity: { value: 0.08 },
  },
  vertexShader: `
    uniform mat4 textureMatrix;
    varying vec4 vProjectedUv;
    varying vec2 vSurfaceUv;
    void main() {
      vProjectedUv = textureMatrix * vec4(position, 1.0);
      vSurfaceUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform float uOpacity;
    varying vec4 vProjectedUv;
    varying vec2 vSurfaceUv;
    void main() {
      vec3 reflected = texture2DProj(tDiffuse, vProjectedUv).rgb * color;
      vec2 edgeDistance = min(vSurfaceUv, 1.0 - vSurfaceUv);
      float edgeFade = smoothstep(0.02, 0.2, min(edgeDistance.x, edgeDistance.y));
      gl_FragColor = vec4(reflected, uOpacity * edgeFade);
    }
  `,
}

function getPalette(content: FeaturedContent | null) {
  return palettes[content?.category || 'MUSIC']
}

function getMetaLabel(category: FeaturedCategory | undefined) {
  if (category === 'ANIME') return 'STUDIO'
  if (category === 'MOVIE') return 'DIRECTOR'
  return 'ARTIST'
}

function configureProgress(isCompact: boolean) {
  progressWeights.clear()
  progressValues.clear()
  if (isCompact) {
    progressWeights.set('scene', 0.22)
    progressWeights.set('content', 0.63)
    progressWeights.set('shader', 0.05)
    progressWeights.set('firstFrame', 0.1)
  } else {
    progressWeights.set('scene', 0.05)
    progressWeights.set('content', 0.13)
    progressWeights.set('environment', 0.12)
    progressWeights.set('gallery', 0.17)
    progressWeights.set('character', 0.38)
    progressWeights.set('reflection', 0.04)
    progressWeights.set('shader', 0.06)
    progressWeights.set('firstFrame', 0.05)
  }
  progressWeights.forEach((_weight, key) => progressValues.set(key, 0))
}

function reportProgress(key: string, value: number, phase: string) {
  progressValues.set(key, THREE.MathUtils.clamp(value, 0, 1))
  let total = 0
  progressWeights.forEach((weight, progressKey) => {
    total += weight * (progressValues.get(progressKey) || 0)
  })
  emit('progress', Math.round(total * 100), phase)
}

async function fetchBinary(
  url: string,
  signal: AbortSignal,
  onProgress: (value: number) => void,
) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${url} (${response.status})`)

  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    onProgress(1)
    return { buffer, contentType: response.headers.get('content-type') || '' }
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      loaded += value.byteLength
      onProgress(total > 0 ? loaded / total : Math.min(0.94, loaded / (loaded + 1_000_000)))
    }
  }

  const bytes = new Uint8Array(loaded)
  let offset = 0
  chunks.forEach((chunk) => {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  })
  onProgress(1)
  return {
    buffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    contentType: response.headers.get('content-type') || '',
  }
}

function createCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1
  return texture
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
) {
  const scale = Math.max(width / imageWidth, height / imageHeight)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (imageWidth - sourceWidth) / 2
  const sourceY = (imageHeight - sourceHeight) / 2
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
}

function extractDominantColor(bitmap: ImageBitmap, fallback: string) {
  const sampleSize = 48
  const canvas = document.createElement('canvas')
  canvas.width = sampleSize
  canvas.height = sampleSize
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return new THREE.Color(fallback)
  drawImageCover(context, bitmap, bitmap.width, bitmap.height, sampleSize, sampleSize)

  const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data
  const buckets = new Map<string, { score: number; red: number; green: number; blue: number }>()
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] || 0
    if (alpha < 220) continue
    const red = pixels[index] || 0
    const green = pixels[index + 1] || 0
    const blue = pixels[index + 2] || 0
    const max = Math.max(red, green, blue) / 255
    const min = Math.min(red, green, blue) / 255
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255
    if (luminance < 0.055 || luminance > 0.94) continue
    const saturation = max > 0 ? (max - min) / max : 0
    const key = `${red >> 4}:${green >> 4}:${blue >> 4}`
    const weight = 0.35 + saturation * 0.9
    const bucket = buckets.get(key) || { score: 0, red: 0, green: 0, blue: 0 }
    bucket.score += weight
    bucket.red += red * weight
    bucket.green += green * weight
    bucket.blue += blue * weight
    buckets.set(key, bucket)
  }

  const dominant = [...buckets.values()].sort((left, right) => right.score - left.score)[0]
  if (!dominant?.score) return new THREE.Color(fallback)
  const color = new THREE.Color(
    dominant.red / dominant.score / 255,
    dominant.green / dominant.score / 255,
    dominant.blue / dominant.score / 255,
  )
  const hsl = { h: 0, s: 0, l: 0 }
  color.getHSL(hsl)
  color.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s * 1.12, 0.28, 0.78), THREE.MathUtils.clamp(hsl.l, 0.34, 0.62))
  return color
}

function createSleeveTexture(content: FeaturedContent | null, bitmap: ImageBitmap | null) {
  const size = compactMode.value ? 1024 : 1536
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return createCanvasTexture(canvas)

  const palette = getPalette(content)
  context.fillStyle = '#050708'
  context.fillRect(0, 0, size, size)
  if (bitmap) {
    drawImageCover(context, bitmap, bitmap.width, bitmap.height, size, size)
  } else {
    context.strokeStyle = palette.accent
    context.globalAlpha = 0.18
    context.lineWidth = Math.max(2, size * 0.002)
    for (let y = -size * 0.12; y < size * 1.12; y += size * 0.075) {
      context.beginPath()
      context.moveTo(-size * 0.05, y)
      context.bezierCurveTo(size * 0.3, y - size * 0.1, size * 0.72, y + size * 0.1, size * 1.05, y)
      context.stroke()
    }
    context.globalAlpha = 1
    context.textAlign = 'center'
    context.fillStyle = palette.primary
    context.font = `500 ${Math.round(size * 0.09)}px "Playfair Display", serif`
    context.fillText('DUMB SIGNAL', size / 2, size * 0.49)
    context.fillStyle = 'rgba(240,246,243,0.58)'
    context.font = `600 ${Math.round(size * 0.021)}px Inter, sans-serif`
    context.fillText('ARCHIVE AWAITS TRANSMISSION', size / 2, size * 0.55)
  }
  return createCanvasTexture(canvas)
}

function createFallbackTextures(content: FeaturedContent | null): SleeveTextures {
  const borderColor = new THREE.Color(getPalette(content).accent)
  return {
    front: createSleeveTexture(content, null),
    back: createSleeveTexture(content, null),
    borderColor,
  }
}

async function loadSleeveTextures(
  content: FeaturedContent | null,
  signal: AbortSignal,
  onProgress: (value: number) => void,
): Promise<SleeveTextures> {
  await document.fonts?.ready
  if (!content?.imageUrl) {
    onProgress(1)
    return createFallbackTextures(content)
  }

  const { buffer, contentType } = await fetchBinary(content.imageUrl, signal, onProgress)
  const bitmap = await createImageBitmap(new Blob([buffer], { type: contentType || 'image/jpeg' }))
  try {
    return {
      front: createSleeveTexture(content, bitmap),
      back: createSleeveTexture(content, bitmap),
      borderColor: extractDominantColor(bitmap, getPalette(content).accent),
    }
  } finally {
    bitmap.close()
  }
}

function disposeTexture(texture: THREE.Texture | null) {
  if (!texture || disposedTextures.has(texture)) return
  disposedTextures.add(texture)
  const source = texture.source?.data
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) source.close()
  texture.dispose()
}

function disposeTextures(textures: SleeveTextures | null) {
  if (!textures) return
  disposeTexture(textures.front)
  disposeTexture(textures.back)
}

function disposeObjectResources(root: THREE.Object3D | null) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root?.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Points)) return
    geometries.add(object.geometry)
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
    objectMaterials.forEach((material) => {
      materials.add(material)
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value)
      })
    })
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  textures.forEach((texture) => disposeTexture(texture))
}

function parseModel(buffer: ArrayBuffer) {
  return new Promise<THREE.Group>((resolve, reject) => {
    new GLTFLoader().parse(
      buffer,
      '/cineform/models/',
      (gltf) => resolve(gltf.scene),
      (error) => reject(error),
    )
  })
}

function prepareGallery(model: THREE.Group) {
  const anchor = new THREE.Group()
  const assetRoot = new THREE.Group()
  assetRoot.add(model)

  model.updateMatrixWorld(true)
  let bounds = new THREE.Box3().setFromObject(model)
  const sourceSize = bounds.getSize(new THREE.Vector3())
  assetRoot.scale.setScalar(16.8 / Math.max(sourceSize.x, 0.001))
  assetRoot.updateMatrixWorld(true)
  bounds = new THREE.Box3().setFromObject(assetRoot)
  const center = bounds.getCenter(new THREE.Vector3())
  assetRoot.position.set(-center.x, -bounds.min.y - 1.16, -center.z - 0.55)

  model.traverse((child) => {
    child.layers.set(GALLERY_LAYER)
    if (!(child instanceof THREE.Mesh)) return
    child.castShadow = false
    child.receiveShadow = false
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      material.fog = true
      material.transparent = false
      material.opacity = 1
      material.depthTest = true
      material.depthWrite = true
      material.alphaTest = 0
      if (material instanceof THREE.MeshBasicMaterial) material.color.multiplyScalar(0.58)
      material.needsUpdate = true
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          value.anisotropy = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1
        }
      })
    })
  })

  anchor.add(assetRoot)
  anchor.rotation.y = Math.PI
  return anchor
}

function prepareCharacter(model: THREE.Group) {
  const anchor = new THREE.Group()
  const assetRoot = new THREE.Group()
  assetRoot.add(model)

  model.updateMatrixWorld(true)
  let bounds = new THREE.Box3().setFromObject(model)
  let size = bounds.getSize(new THREE.Vector3())
  if (size.z > size.y * 1.35) model.rotation.x = -Math.PI / 2

  model.updateMatrixWorld(true)
  bounds = new THREE.Box3().setFromObject(model)
  size = bounds.getSize(new THREE.Vector3())
  assetRoot.scale.setScalar(2.2 / Math.max(size.y, 0.001))
  assetRoot.updateMatrixWorld(true)
  bounds = new THREE.Box3().setFromObject(assetRoot)
  const center = bounds.getCenter(new THREE.Vector3())
  assetRoot.position.set(-center.x, -bounds.min.y, -center.z)

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    if (materials.some((material) => ['ground', 'light', 'ring'].includes(material.name.toLowerCase()))) {
      child.visible = false
      return
    }
    child.castShadow = true
    child.receiveShadow = true
    materials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = 0.16
        material.emissiveIntensity = Math.min(material.emissiveIntensity, 0.08)
      }
    })
  })

  const fashionRoot = new THREE.Group()
  fashionRoot.rotation.set(-0.028, Math.PI / 2, -0.018)
  fashionRoot.add(assetRoot)
  anchor.add(fashionRoot)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.46, 48),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.012
  anchor.add(shadow)
  const characterPosition = new THREE.Vector3(3.8, FLOOR_Y, 2.95)
  anchor.position.copy(characterPosition)
  const exhibitDirection = new THREE.Vector3(1.12, FLOOR_Y, 2.62).sub(characterPosition)
  anchor.rotation.y = Math.atan2(exhibitDirection.x, exhibitDirection.z) - Math.PI - Math.PI / 3
  anchor.scale.setScalar(0.94)
  return anchor
}

function createDust(color: string, isCompact: boolean) {
  const count = isCompact ? 150 : 360
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * (isCompact ? 8 : 12)
    positions[index * 3 + 1] = Math.random() * 5 - 0.9
    positions[index * 3 + 2] = Math.random() * 7 - 1.6
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    color,
    size: isCompact ? 0.018 : 0.013,
    transparent: true,
    opacity: isCompact ? 0.12 : 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  return new THREE.Points(geometry, material)
}

function createFloorReflection() {
  const pixelRatio = renderer?.getPixelRatio() || 1
  const width = Math.max(1, Math.floor(window.innerWidth * pixelRatio * 0.45))
  const height = Math.max(1, Math.floor(window.innerHeight * pixelRatio * 0.45))
  const reflector = new Reflector(new THREE.PlaneGeometry(9.4, 6.7), {
    clipBias: 0.002,
    textureWidth: width,
    textureHeight: height,
    color: 0x8d9698,
    multisample: 0,
    shader: reflectionShader,
  })
  reflector.rotation.x = -Math.PI / 2
  reflector.position.set(0.1, FLOOR_Y + 0.006, 1.55)
  reflector.renderOrder = 1
  const material = reflector.material as THREE.ShaderMaterial
  material.transparent = true
  material.depthWrite = false
  return reflector
}

function createCompactRoom(palette: Palette) {
  if (!scene) return
  const room = new THREE.Group()
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x171b1c,
    emissive: 0x090c0d,
    emissiveIntensity: 0.72,
    roughness: 0.94,
    metalness: 0.04,
    side: THREE.DoubleSide,
  })
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x202526,
    emissive: 0x050708,
    emissiveIntensity: 0.42,
    roughness: 0.62,
    metalness: 0.26,
  })

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(13, 16), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, FLOOR_Y, 1.5)
  floor.receiveShadow = true
  room.add(floor)

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), wallMaterial)
  backWall.position.set(0, 2.6, -3.5)
  room.add(backWall)

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(11, 8), wallMaterial)
  leftWall.rotation.y = Math.PI / 2
  leftWall.position.set(-5.4, 2.6, 0.9)
  room.add(leftWall)

  const rightWall = leftWall.clone()
  rightWall.rotation.y = -Math.PI / 2
  rightWall.position.x = 5.4
  room.add(rightWall)

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(13, 12), wallMaterial)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.set(0, 5.2, 1)
  room.add(ceiling)

  const stripMaterial = new THREE.MeshBasicMaterial({ color: palette.accent, toneMapped: false })
  const backStrip = new THREE.Mesh(new THREE.BoxGeometry(10.7, 0.025, 0.025), stripMaterial)
  backStrip.position.set(0, FLOOR_Y + 0.035, -3.42)
  room.add(backStrip)

  const pedestalMaterial = new THREE.MeshStandardMaterial({
    color: 0x141819,
    emissive: 0x050708,
    emissiveIntensity: 0.48,
    metalness: 0.42,
    roughness: 0.46,
  })
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.34, 0.86, 4), pedestalMaterial)
  pedestal.rotation.y = Math.PI / 4
  pedestal.position.set(0, FLOOR_Y + 0.43, 0.45)
  pedestal.castShadow = true
  pedestal.receiveShadow = true
  room.add(pedestal)
  scene.add(room)
}

function createSleeveStage(initialTextures: SleeveTextures) {
  if (!scene) return
  exhibitRoot = new THREE.Group()
  exhibitRoot.position.set(
    compactMode.value ? 0 : 1.12,
    compactMode.value ? -0.27 : 0.08,
    compactMode.value ? 0.45 : 2.62,
  )
  if (compactMode.value) exhibitRoot.scale.setScalar(0.9)
  scene.add(exhibitRoot)

  sleevePivot = new THREE.Group()
  sleevePivot.position.y = compactMode.value ? 0.3 : 0.56
  sleevePivot.rotation.y = reduceMotion ? 0.2 : -0.15
  sleevePivot.rotation.z = Math.PI / 4
  exhibitRoot.add(sleevePivot)

  sleeveEdgeMaterial = new THREE.MeshStandardMaterial({
    color: initialTextures.borderColor,
    emissive: initialTextures.borderColor,
    emissiveIntensity: 0.22,
    metalness: 0.46,
    roughness: 0.36,
  })
  const darkFace = new THREE.MeshStandardMaterial({
    color: 0x050607,
    metalness: 0.12,
    roughness: 0.58,
  })
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(SLEEVE_SIZE, SLEEVE_SIZE, SLEEVE_DEPTH),
    [sleeveEdgeMaterial, sleeveEdgeMaterial, sleeveEdgeMaterial, sleeveEdgeMaterial, darkFace, darkFace],
  )
  body.castShadow = !compactMode.value
  body.receiveShadow = true
  sleevePivot.add(body)

  const planeGeometry = new THREE.PlaneGeometry(SLEEVE_SIZE - 0.016, SLEEVE_SIZE - 0.016)
  activeFrontMaterial = new THREE.MeshBasicMaterial({ map: initialTextures.front, transparent: true })
  activeFrontMaterial.toneMapped = false
  const activeFront = new THREE.Mesh(planeGeometry, activeFrontMaterial)
  activeFront.position.z = SLEEVE_DEPTH / 2 + 0.002
  activeFront.renderOrder = 3
  sleevePivot.add(activeFront)

  pendingFrontMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  pendingFrontMaterial.toneMapped = false
  const pendingFront = new THREE.Mesh(planeGeometry, pendingFrontMaterial)
  pendingFront.position.z = SLEEVE_DEPTH / 2 + 0.004
  pendingFront.renderOrder = 4
  sleevePivot.add(pendingFront)

  activeBackMaterial = new THREE.MeshBasicMaterial({ map: initialTextures.back, transparent: true })
  activeBackMaterial.toneMapped = false
  const activeBack = new THREE.Mesh(planeGeometry, activeBackMaterial)
  activeBack.rotation.y = Math.PI
  activeBack.position.z = -SLEEVE_DEPTH / 2 - 0.002
  activeBack.renderOrder = 3
  sleevePivot.add(activeBack)

  pendingBackMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  pendingBackMaterial.toneMapped = false
  const pendingBack = new THREE.Mesh(planeGeometry, pendingBackMaterial)
  pendingBack.rotation.y = Math.PI
  pendingBack.position.z = -SLEEVE_DEPTH / 2 - 0.004
  pendingBack.renderOrder = 4
  sleevePivot.add(pendingBack)

  const collisionMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  collisionMaterial.colorWrite = false
  collisionMaterial.depthWrite = false
  collisionMesh = new THREE.Mesh(
    new THREE.BoxGeometry(SLEEVE_SIZE * 1.04, SLEEVE_SIZE * 1.04, SLEEVE_DEPTH * 2.4),
    collisionMaterial,
  )
  collisionMesh.renderOrder = -1
  sleevePivot.add(collisionMesh)

  exhibitRoot.traverse((object) => object.layers.enable(EXHIBIT_LAYER))

}

function createLighting(palette: Palette) {
  if (!scene) return
  scene.add(new THREE.HemisphereLight(palette.primary, 0x020304, compactMode.value ? 0.42 : 0.035))
  if (compactMode.value) scene.add(new THREE.AmbientLight(0xdce7e3, 0.06))

  keyLight = new THREE.SpotLight(
    palette.primary,
    compactMode.value ? 9 : 11,
    12,
    THREE.MathUtils.degToRad(compactMode.value ? 24 : 16),
    0.74,
    2,
  )
  keyLight.position.set(compactMode.value ? 0 : 1.12, 4.1, compactMode.value ? 3.5 : 4.85)
  keyLight.target.position.set(compactMode.value ? 0 : 1.12, 0.62, compactMode.value ? 0.45 : 2.62)
  keyLight.layers.set(EXHIBIT_LAYER)
  keyLight.castShadow = !compactMode.value
  if (!compactMode.value) {
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.camera.near = 0.5
    keyLight.shadow.camera.far = 12
    keyLight.shadow.bias = -0.0004
    keyLight.shadow.normalBias = 0.025
  }
  scene.add(keyLight, keyLight.target)

  accentLight = new THREE.PointLight(palette.accent, compactMode.value ? 2.2 : 1.8, 4.2, 2)
  accentLight.layers.set(EXHIBIT_LAYER)
  accentLight.position.set(compactMode.value ? 0 : 1.12, 0.5, compactMode.value ? 1.2 : 3.35)
  scene.add(accentLight)

  if (!compactMode.value) {
    exhibitLight = new THREE.RectAreaLight(palette.primary, 2.15, 1.5, 1.8)
    exhibitLight.layers.set(EXHIBIT_LAYER)
    exhibitLight.position.set(1.12, 1.45, 4.15)
    exhibitLight.lookAt(1.12, 0.95, 2.62)
    scene.add(exhibitLight)

    const characterLightColor = new THREE.Color(palette.primary).lerp(new THREE.Color(0xffffff), 0.72)
    characterLight = new THREE.SpotLight(
      characterLightColor,
      5.8,
      5.4,
      THREE.MathUtils.degToRad(24),
      0.9,
      2,
    )
    characterLight.position.set(4.75, 2.35, 5.05)
    characterLight.target.position.set(3.8, -0.05, 2.95)
    scene.add(characterLight, characterLight.target)
  }
}

function setupPostprocessing() {
  if (!renderer || !scene || !camera || compactMode.value) return
  composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.045, 0.16, 0.98))
  composer.addPass(new ShaderPass(cinematicShader))
  composer.addPass(new OutputPass())
}

function setupScene() {
  const container = containerRef.value
  const canvas = canvasRef.value
  if (!container || !canvas) throw new Error('3D canvas is unavailable')

  compactMode.value = window.innerWidth <= 768
  configureProgress(compactMode.value)
  const palette = getPalette(props.content)

  scene = new THREE.Scene()
  scene.background = new THREE.Color(palette.background)
  scene.fog = new THREE.FogExp2(palette.background, compactMode.value ? 0.03 : 0.016)

  camera = new THREE.PerspectiveCamera(compactMode.value ? 42 : 44, 1, 0.1, 60)
  camera.position.copy(compactMode.value ? new THREE.Vector3(0, 0.85, 7.25) : cameraWidePosition)
  camera.lookAt(compactMode.value ? new THREE.Vector3(0, 0.25, 0.35) : cameraWideTarget)
  camera.layers.enable(EXHIBIT_LAYER)
  if (!compactMode.value) camera.layers.enable(GALLERY_LAYER)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, compactMode.value ? 1.2 : 1.4))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = compactMode.value ? 0.82 : 0.72
  renderer.shadowMap.enabled = !compactMode.value
  renderer.shadowMap.type = THREE.PCFShadowMap

  const fallback = createFallbackTextures(props.content)
  activeFrontTexture = fallback.front
  activeBackTexture = fallback.back
  createSleeveStage(fallback)

  if (compactMode.value) {
    createCompactRoom(palette)
  } else {
    floorReflector = createFloorReflection()
    scene.add(floorReflector)
    reportProgress('reflection', 1, 'POLISHING REFLECTIONS')
  }

  createLighting(palette)
  dust = createDust(palette.primary, compactMode.value)
  scene.add(dust)
  setupPostprocessing()

  container.addEventListener('pointermove', handlePointerMove)
  container.addEventListener('pointerleave', handlePointerLeave)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  motionPreference.addEventListener('change', handleMotionPreference)
  resize()
  reportProgress('scene', 1, compactMode.value ? 'BUILDING COMPACT GALLERY' : 'BUILDING EXHIBITION STAGE')
}

function setActiveTextures(textures: SleeveTextures) {
  disposeTexture(activeFrontTexture)
  disposeTexture(activeBackTexture)
  activeFrontTexture = textures.front
  activeBackTexture = textures.back
  if (activeFrontMaterial) {
    activeFrontMaterial.map = activeFrontTexture
    activeFrontMaterial.opacity = 1
    activeFrontMaterial.needsUpdate = true
  }
  if (activeBackMaterial) {
    activeBackMaterial.map = activeBackTexture
    activeBackMaterial.opacity = 1
    activeBackMaterial.needsUpdate = true
  }
  activeBorderColor.copy(textures.borderColor)
  sleeveEdgeMaterial?.color.copy(activeBorderColor)
  sleeveEdgeMaterial?.emissive.copy(activeBorderColor)
}

function applyPalette(content: FeaturedContent | null) {
  const palette = getPalette(content)
  if (scene?.background instanceof THREE.Color) scene.background.set(palette.background)
  scene?.fog?.color.set(palette.background)
  keyLight?.color.set(palette.primary)
  accentLight?.color.set(palette.accent)
  exhibitLight?.color.set(palette.primary)
  characterLight?.color.set(palette.primary).lerp(new THREE.Color(0xffffff), 0.72)
  if (dust?.material instanceof THREE.PointsMaterial) dust.material.color.set(palette.primary)
}

async function initialize() {
  disposed = false
  abortController = new AbortController()
  try {
    setupScene()
    const signal = abortController.signal

    const contentPromise = loadSleeveTextures(props.content, signal, (value) => {
      reportProgress('content', value, 'PREPARING FEATURED OBJECT')
    })

    const environmentPromise = compactMode.value
      ? Promise.resolve<THREE.Texture | null>(null)
      : fetchBinary(ENVIRONMENT_URL, signal, (value) => {
          reportProgress('environment', value, 'LIGHTING THE GALLERY')
        }).then(({ buffer }) => {
          if (!renderer) throw new Error('Renderer is unavailable')
          const hdr = new HDRLoader().parse(buffer)
          const source = new THREE.DataTexture(
            hdr.data,
            hdr.width,
            hdr.height,
            THREE.RGBAFormat,
            hdr.type,
          )
          source.mapping = THREE.EquirectangularReflectionMapping
          source.colorSpace = THREE.LinearSRGBColorSpace
          source.minFilter = THREE.LinearFilter
          source.magFilter = THREE.LinearFilter
          source.generateMipmaps = false
          source.flipY = true
          source.needsUpdate = true
          const generator = new THREE.PMREMGenerator(renderer)
          generator.compileEquirectangularShader()
          const environment = generator.fromEquirectangular(source).texture
          source.dispose()
          generator.dispose()
          reportProgress('environment', 1, 'LIGHTING THE GALLERY')
          return environment
        })

    const galleryPromise = compactMode.value
      ? Promise.resolve<THREE.Group | null>(null)
      : fetchBinary(GALLERY_URL, signal, (value) => {
          reportProgress('gallery', value * 0.9, 'OPENING PYRAMID GALLERY')
        }).then(async ({ buffer }) => {
          reportProgress('gallery', 0.94, 'POSITIONING GALLERY')
          const model = await parseModel(buffer)
          reportProgress('gallery', 1, 'POSITIONING GALLERY')
          return prepareGallery(model)
        })

    const characterPromise = compactMode.value
      ? Promise.resolve<THREE.Group | null>(null)
      : fetchBinary(CHARACTER_URL, signal, (value) => {
          reportProgress('character', value * 0.9, 'LOADING CHARACTER')
        }).then(async ({ buffer }) => {
          reportProgress('character', 0.94, 'POSITIONING CHARACTER')
          const model = await parseModel(buffer)
          reportProgress('character', 1, 'POSITIONING CHARACTER')
          return prepareCharacter(model)
        })

    const [contentResult, environmentResult, galleryResult, characterResult] = await Promise.allSettled([
      contentPromise,
      environmentPromise,
      galleryPromise,
      characterPromise,
    ])
    const cleanupDetachedResources = () => {
      if (contentResult.status === 'fulfilled') disposeTextures(contentResult.value)
      if (environmentResult.status === 'fulfilled') environmentResult.value?.dispose()
      if (galleryResult.status === 'fulfilled') disposeObjectResources(galleryResult.value)
      if (characterResult.status === 'fulfilled') disposeObjectResources(characterResult.value)
    }
    if (disposed || signal.aborted || !scene || !renderer || !camera || !sleevePivot) {
      cleanupDetachedResources()
      return
    }
    if (contentResult.status === 'rejected') {
      cleanupDetachedResources()
      throw contentResult.reason
    }
    if (environmentResult.status === 'rejected') {
      cleanupDetachedResources()
      throw environmentResult.reason
    }
    if (galleryResult.status === 'rejected') {
      cleanupDetachedResources()
      throw galleryResult.reason
    }
    if (characterResult.status === 'rejected') {
      cleanupDetachedResources()
      throw characterResult.reason
    }

    setActiveTextures(contentResult.value)
    displayContent.value = props.content

    if (environmentResult.value) {
      environmentTexture = environmentResult.value
      scene.environment = environmentTexture
      scene.environmentIntensity = 0.18
      scene.environmentRotation.y = 0.42
    }
    if (galleryResult.value) {
      galleryRoot = galleryResult.value
      scene.add(galleryRoot)
    }
    if (characterResult.value) {
      characterRoot = characterResult.value
      scene.add(characterRoot)
    }

    reportProgress('shader', 0.35, 'COMPILING EXHIBITION SHADERS')
    renderer.compile(scene, camera)
    updateCamera(0)
    renderScene(0)
    reportProgress('shader', 1, 'COMPILING EXHIBITION SHADERS')
    updateOverlay()
    reportProgress('firstFrame', 1, 'FINALIZING FRAME')
    initialized = true
    sceneReady.value = true
    emit('ready')
    startLoop()
  } catch (error) {
    if (disposed || abortController?.signal.aborted) return
    const message = error instanceof Error ? error.message : 'Unknown loading error'
    emit('error', `Unable to load Cineform stage: ${message}`)
  }
}

async function updateContent(content: FeaturedContent | null) {
  if (!initialized) return
  const token = ++contentLoadToken
  contentAbortController?.abort()
  const controller = new AbortController()
  contentAbortController = controller
  try {
    const loaded = await loadSleeveTextures(content, controller.signal, () => {})
    if (disposed || token !== contentLoadToken) {
      disposeTextures(loaded)
      return
    }

    displayContent.value = content
    mobileInfoVisible.value = false
    applyPalette(content)
    if (reduceMotion || !pendingFrontMaterial || !pendingBackMaterial) {
      setActiveTextures(loaded)
      renderOnce()
      return
    }

    disposeTexture(pendingFrontTexture)
    disposeTexture(pendingBackTexture)
    pendingFrontTexture = loaded.front
    pendingBackTexture = loaded.back
    pendingBorderColor = loaded.borderColor.clone()
    pendingFrontMaterial.map = pendingFrontTexture
    pendingFrontMaterial.opacity = 0
    pendingFrontMaterial.needsUpdate = true
    pendingBackMaterial.map = pendingBackTexture
    pendingBackMaterial.opacity = 0
    pendingBackMaterial.needsUpdate = true
    textureTransitionStart = performance.now()
    startLoop()
  } catch (error) {
    if (!controller.signal.aborted) console.warn('Unable to update the featured exhibition object.', error)
  } finally {
    if (contentAbortController === controller) contentAbortController = null
  }
}

function finishTextureTransition() {
  if (!pendingFrontTexture || !pendingBackTexture || !pendingBorderColor) return
  const loaded = {
    front: pendingFrontTexture,
    back: pendingBackTexture,
    borderColor: pendingBorderColor,
  }
  pendingFrontTexture = null
  pendingBackTexture = null
  pendingBorderColor = null
  if (pendingFrontMaterial) {
    pendingFrontMaterial.map = null
    pendingFrontMaterial.opacity = 0
    pendingFrontMaterial.needsUpdate = true
  }
  if (pendingBackMaterial) {
    pendingBackMaterial.map = null
    pendingBackMaterial.opacity = 0
    pendingBackMaterial.needsUpdate = true
  }
  setActiveTextures(loaded)
  textureTransitionStart = 0
}

function smootherStep(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function updateCamera(time: number) {
  if (!camera) return
  if (compactMode.value) {
    camera.position.set(0, 0.85, 7.25)
    camera.lookAt(0, 0.25, 0.35)
    return
  }

  const phase = (time % CAMERA_CYCLE_SECONDS) / CAMERA_CYCLE_SECONDS
  let progress = 0
  if (phase < 0.42) {
    progress = smootherStep(phase / 0.42)
    cameraPosition.lerpVectors(cameraWidePosition, cameraNearPosition, progress)
    cameraTarget.lerpVectors(cameraWideTarget, cameraNearTarget, progress)
  } else if (phase < 0.72) {
    progress = smootherStep((phase - 0.42) / 0.3)
    cameraPosition.lerpVectors(cameraNearPosition, cameraRightPosition, progress)
    cameraTarget.lerpVectors(cameraNearTarget, cameraRightTarget, progress)
  } else {
    progress = smootherStep((phase - 0.72) / 0.28)
    cameraPosition.lerpVectors(cameraRightPosition, cameraWidePosition, progress)
    cameraTarget.lerpVectors(cameraRightTarget, cameraWideTarget, progress)
  }

  camera.position.set(
    cameraPosition.x + pointer.x * 0.045,
    cameraPosition.y + pointer.y * 0.025,
    cameraPosition.z,
  )
  camera.lookAt(
    cameraTarget.x + pointer.x * 0.012,
    cameraTarget.y + pointer.y * 0.009,
    cameraTarget.z,
  )
}

function updateOverlay() {
  const container = containerRef.value
  if (!container || !camera || !sleevePivot || !exhibitRoot || !sceneReady.value) return
  const { width, height } = container.getBoundingClientRect()
  sleevePivot.updateMatrixWorld(true)

  const half = SLEEVE_SIZE * 0.52
  const depth = SLEEVE_DEPTH * 1.3
  const projected = [
    [-half, half, depth], [half, half, depth], [half, -half, depth], [-half, -half, depth],
    [-half, half, -depth], [half, half, -depth], [half, -half, -depth], [-half, -half, -depth],
  ].map(([x, y, z]) => {
    const point = new THREE.Vector3(x, y, z)
    sleevePivot?.localToWorld(point)
    point.project(camera as THREE.PerspectiveCamera)
    return new THREE.Vector2((point.x * 0.5 + 0.5) * width, (-point.y * 0.5 + 0.5) * height)
  })

  const minX = Math.min(...projected.map((point) => point.x))
  const maxX = Math.max(...projected.map((point) => point.x))
  const minY = Math.min(...projected.map((point) => point.y))
  const maxY = Math.max(...projected.map((point) => point.y))
  const visible = [minX, maxX, minY, maxY].every(Number.isFinite)
  hitAreaStyle.value = {
    left: `${minX}px`,
    top: `${minY}px`,
    width: `${Math.max(0, maxX - minX)}px`,
    height: `${Math.max(0, maxY - minY)}px`,
    opacity: visible ? '1' : '0',
  }

  if (compactMode.value) {
    infoStyle.value = {
      left: '24px',
      top: `${Math.max(height * 0.64, height - 230)}px`,
      visibility: visible ? 'visible' : 'hidden',
    }
    return
  }

  projectionPoint.set(-1, 0.6, 0.05)
  exhibitRoot.localToWorld(projectionPoint)
  projectionPoint.project(camera)
  const projectedX = (projectionPoint.x * 0.5 + 0.5) * width
  const projectedY = (-projectionPoint.y * 0.5 + 0.5) * height
  infoStyle.value = {
    left: `${THREE.MathUtils.clamp(projectedX - 270, 28, width - 294)}px`,
    top: `${THREE.MathUtils.clamp(projectedY, 180, height - 150)}px`,
    visibility: visible ? 'visible' : 'hidden',
  }
}

function updateRaycast(event: PointerEvent) {
  const container = containerRef.value
  if (!container || !camera || !collisionMesh || compactMode.value) return false
  const rect = container.getBoundingClientRect()
  rayPointer.set(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -(((event.clientY - rect.top) / rect.height) * 2 - 1),
  )
  collisionMesh.updateMatrixWorld(true)
  raycaster.setFromCamera(rayPointer, camera)
  return raycaster.intersectObject(collisionMesh, false).length > 0
}

function clearHoverSoon() {
  if (hoverClearTimer !== null) window.clearTimeout(hoverClearTimer)
  hoverClearTimer = window.setTimeout(() => {
    if (!infoHoverLock && !isFocused.value) isHovered.value = false
    hoverClearTimer = null
  }, 130)
}

function handlePointerMove(event: PointerEvent) {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  if (!reduceMotion) {
    pointerTarget.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    )
  }
  if (compactMode.value || !sceneReady.value) return
  if (infoHoverLock || updateRaycast(event)) {
    if (hoverClearTimer !== null) window.clearTimeout(hoverClearTimer)
    hoverClearTimer = null
    isHovered.value = true
  } else {
    clearHoverSoon()
  }
}

function handlePointerLeave() {
  pointerTarget.set(0, 0)
  if (!infoHoverLock && !isFocused.value) isHovered.value = false
}

function handleInfoEnter() {
  infoHoverLock = true
  if (hoverClearTimer !== null) window.clearTimeout(hoverClearTimer)
  hoverClearTimer = null
  isHovered.value = true
}

function handleInfoLeave() {
  infoHoverLock = false
  if (!isFocused.value) clearHoverSoon()
}

function handleVisibilityChange() {
  if (document.hidden) stopLoop()
  else startLoop()
}

function handleMotionPreference(event: MediaQueryListEvent) {
  reduceMotion = event.matches
  if (sleevePivot && reduceMotion) sleevePivot.rotation.y = 0.2
  if (reduceMotion) {
    finishTextureTransition()
    stopLoop()
    renderOnce()
  } else {
    startLoop()
  }
}

function renderScene(delta: number) {
  if (!renderer || !scene || !camera) return
  if (composer) composer.render(delta)
  else renderer.render(scene, camera)
}

function renderFrame(now: number) {
  animationFrame = 0
  if (!componentActive || document.hidden || !renderer || !scene || !camera) return
  const delta = Math.min((now - previousFrame) / 1000, 0.05)
  previousFrame = now

  if (!reduceMotion) {
    elapsedTime += delta
    pointer.lerp(pointerTarget, 1 - Math.pow(0.002, delta))
    const shouldPause = isHovered.value || isFocused.value || mobileInfoVisible.value
    const targetSpeed = shouldPause ? 0 : (Math.PI * 2) / SLEEVE_ROTATION_SECONDS
    rotationSpeed = THREE.MathUtils.damp(rotationSpeed, targetSpeed, shouldPause ? 8 : 3.5, delta)
    if (sleevePivot && shouldPause) {
      const fullTurn = Math.PI * 2
      const frontAngle = Math.round((sleevePivot.rotation.y - 0.16) / fullTurn) * fullTurn + 0.16
      sleevePivot.rotation.y = THREE.MathUtils.damp(sleevePivot.rotation.y, frontAngle, 4.8, delta)
    } else if (sleevePivot) {
      sleevePivot.rotation.y += rotationSpeed * delta
    }
    if (dust) {
      dust.rotation.y = elapsedTime * 0.009
      dust.position.y = Math.sin(elapsedTime * 0.07) * 0.045
    }
  }

  if (textureTransitionStart > 0 && pendingFrontTexture && pendingBackTexture) {
    const mix = smootherStep((now - textureTransitionStart) / 720)
    if (activeFrontMaterial) activeFrontMaterial.opacity = 1 - mix
    if (activeBackMaterial) activeBackMaterial.opacity = 1 - mix
    if (pendingFrontMaterial) pendingFrontMaterial.opacity = mix
    if (pendingBackMaterial) pendingBackMaterial.opacity = mix
    if (sleeveEdgeMaterial && pendingBorderColor) {
      sleeveEdgeMaterial.color.lerpColors(activeBorderColor, pendingBorderColor, mix)
      sleeveEdgeMaterial.emissive.lerpColors(activeBorderColor, pendingBorderColor, mix)
    }
    if (mix >= 1) finishTextureTransition()
  }

  updateCamera(elapsedTime)
  renderScene(delta)
  updateOverlay()
  if (!reduceMotion) animationFrame = requestAnimationFrame(renderFrame)
}

function renderOnce() {
  if (!renderer || !scene || !camera) return
  updateCamera(elapsedTime)
  renderScene(0)
  updateOverlay()
}

function startLoop() {
  if (!initialized || animationFrame || !componentActive || document.hidden) return
  previousFrame = performance.now()
  if (reduceMotion) renderOnce()
  else animationFrame = requestAnimationFrame(renderFrame)
}

function stopLoop() {
  if (!animationFrame) return
  cancelAnimationFrame(animationFrame)
  animationFrame = 0
}

function resize() {
  const container = containerRef.value
  if (!container || !camera || !renderer) return
  const { width, height } = container.getBoundingClientRect()
  if (width <= 0 || height <= 0) return
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  const pixelRatio = Math.min(window.devicePixelRatio, compactMode.value ? 1.2 : 1.4)
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height, false)
  composer?.setPixelRatio(pixelRatio)
  composer?.setSize(width, height)
  floorReflector?.getRenderTarget().setSize(
    Math.max(1, Math.floor(width * pixelRatio * 0.45)),
    Math.max(1, Math.floor(height * pixelRatio * 0.45)),
  )
  renderOnce()
}

function openContent() {
  const route = displayContent.value?.route
  if (route) emit('open', route)
}

function handleExhibitClick() {
  if (compactMode.value) {
    mobileInfoVisible.value = true
    if (sleevePivot) sleevePivot.rotation.y = 0.16
    rotationSpeed = 0
    renderOnce()
    return
  }
  openContent()
}

function disposeScene() {
  disposed = true
  initialized = false
  abortController?.abort()
  contentAbortController?.abort()
  stopLoop()
  if (hoverClearTimer !== null) window.clearTimeout(hoverClearTimer)
  hoverClearTimer = null
  resizeObserver?.disconnect()
  resizeObserver = null
  const container = containerRef.value
  container?.removeEventListener('pointermove', handlePointerMove)
  container?.removeEventListener('pointerleave', handlePointerLeave)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  motionPreference.removeEventListener('change', handleMotionPreference)

  floorReflector?.dispose()
  composer?.passes.forEach((pass) => pass.dispose())
  composer?.dispose()
  disposeObjectResources(scene)
  disposeTexture(activeFrontTexture)
  disposeTexture(activeBackTexture)
  disposeTexture(pendingFrontTexture)
  disposeTexture(pendingBackTexture)
  if (scene) scene.environment = null
  environmentTexture?.dispose()
  renderer?.renderLists.dispose()
  renderer?.dispose()

  scene = null
  camera = null
  renderer = null
  composer = null
  exhibitRoot = null
  sleevePivot = null
  collisionMesh = null
  activeFrontMaterial = null
  activeBackMaterial = null
  pendingFrontMaterial = null
  pendingBackMaterial = null
  sleeveEdgeMaterial = null
  keyLight = null
  accentLight = null
  exhibitLight = null
  characterLight = null
  dust = null
  galleryRoot = null
  characterRoot = null
  floorReflector = null
  environmentTexture = null
  activeFrontTexture = null
  activeBackTexture = null
  pendingFrontTexture = null
  pendingBackTexture = null
  pendingBorderColor = null
  abortController = null
  contentAbortController = null
}

watch(
  () => props.content
    ? `${props.content.category}:${props.content.id}:${props.content.timestamp}:${props.content.imageUrl}`
    : 'empty',
  () => {
    if (initialized) void updateContent(props.content)
  },
)

onMounted(() => {
  void initialize()
})

onActivated(() => {
  componentActive = true
  startLoop()
})

onDeactivated(() => {
  componentActive = false
  stopLoop()
})

onBeforeUnmount(disposeScene)
</script>

<template>
  <div
    ref="containerRef"
    class="cineform-stage"
    :class="{
      'is-ready': sceneReady,
      'is-compact': compactMode,
      'is-inspecting': infoVisible,
    }"
  >
    <canvas ref="canvasRef" class="cineform-canvas" aria-hidden="true" />

    <button
      v-if="displayContent"
      type="button"
      class="exhibit-hit-area"
      :style="hitAreaStyle"
      :aria-label="`Open latest ${displayContent.category.toLowerCase()} feature: ${displayContent.title}`"
      @click="handleExhibitClick"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @keydown.enter.prevent="openContent"
      @keydown.space.prevent="openContent"
    />

    <aside
      v-if="displayContent"
      class="exhibit-info"
      :class="{ 'is-visible': infoVisible }"
      :style="infoStyle"
      aria-live="polite"
      @pointerenter="handleInfoEnter"
      @pointerleave="handleInfoLeave"
    >
      <span class="info-rule" />
      <p class="info-category">LATEST / {{ displayContent.category }}</p>
      <h2>{{ displayContent.title }}</h2>
      <p class="info-meta">
        <span>{{ getMetaLabel(displayContent.category) }}</span>
        {{ displayContent.meta }}
      </p>
      <button type="button" class="info-cta" @click="openContent">
        VIEW SIGNAL <span aria-hidden="true">+</span>
      </button>
    </aside>
  </div>
</template>

<style scoped>
.cineform-stage {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: #050708;
}

.cineform-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.exhibit-hit-area {
  position: absolute;
  z-index: 2;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
}

.exhibit-hit-area:focus-visible {
  outline: 1px solid rgba(244, 248, 246, 0.84);
  outline-offset: 6px;
}

.exhibit-info {
  position: absolute;
  z-index: 3;
  display: grid;
  width: min(270px, calc(100vw - 48px));
  gap: 11px;
  padding: 4px 0;
  color: #f4f7f5;
  pointer-events: none;
  opacity: 0;
  transform: translate(18px, -50%);
  transition: opacity 260ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.94);
}

.exhibit-info.is-visible {
  pointer-events: auto;
  opacity: 1 !important;
  transform: translate(0, -50%);
}

.info-rule {
  width: 48px;
  height: 2px;
  background: rgba(244, 248, 246, 0.88);
}

.info-category,
.info-meta {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 0.64rem;
  font-weight: 600;
  line-height: 1.55;
  color: rgba(244, 248, 246, 0.66);
}

.info-category {
  margin-top: 3px;
}

.exhibit-info h2 {
  overflow-wrap: anywhere;
  margin: 1px 0 3px;
  font-family: 'Playfair Display', 'Noto Serif SC', serif;
  font-size: clamp(1.55rem, 2.35vw, 2.45rem);
  font-weight: 500;
  line-height: 1.08;
  letter-spacing: 0;
}

.info-meta span {
  margin-right: 8px;
  color: rgba(244, 248, 246, 0.92);
}

.info-cta {
  justify-self: start;
  margin: 8px 0 0;
  padding: 7px 0;
  border: 0;
  border-bottom: 1px solid rgba(244, 248, 246, 0.45);
  border-radius: 0;
  background: transparent;
  color: rgba(244, 248, 246, 0.88);
  font-family: 'Courier New', monospace;
  font-size: 0.66rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 180ms ease, color 180ms ease;
}

.info-cta span {
  margin-left: 12px;
}

.info-cta:hover,
.info-cta:focus-visible {
  border-color: #fff;
  color: #fff;
  outline: none;
}

@media (max-width: 768px) {
  .exhibit-info,
  .exhibit-info.is-visible {
    gap: 8px;
    transform: translateY(12px);
  }

  .exhibit-info.is-visible {
    transform: translateY(0);
  }

  .exhibit-info h2 {
    max-width: 100%;
    font-size: clamp(1.35rem, 7vw, 2rem);
  }

  .info-category,
  .info-meta,
  .info-cta {
    font-size: 0.6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .exhibit-info,
  .info-cta {
    transition: none;
  }
}
</style>
