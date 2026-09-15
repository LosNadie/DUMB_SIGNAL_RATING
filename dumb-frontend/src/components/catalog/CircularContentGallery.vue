<script setup lang="ts">
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'
import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl'
import type { OGLRenderingContext } from 'ogl'
import type {
  CatalogCoverRect,
  CatalogGalleryItem,
  CatalogOpenPayload,
} from './catalogGallery'

const props = withDefaults(defineProps<{
  items: CatalogGalleryItem[]
  aspectRatio?: number
  bend?: number
  borderRadius?: number
  scrollSpeed?: number
  scrollEase?: number
  activeId?: number | null
  interactionLocked?: boolean
  transitioningItemId?: number | null
}>(), {
  aspectRatio: 1,
  bend: 9,
  borderRadius: 0.1,
  scrollSpeed: 1.8,
  scrollEase: 0.05,
  interactionLocked: false,
  transitioningItemId: null,
})

const emit = defineEmits<{
  (event: 'active-change', item: CatalogGalleryItem): void
  (event: 'cover-rect', payload: CatalogOpenPayload): void
  (event: 'open', payload: CatalogOpenPayload): void
  (event: 'prefetch', item: CatalogGalleryItem): void
}>()

interface TextureRecord {
  key: string
  texture: Texture
  image: HTMLImageElement | HTMLCanvasElement
}

interface MediaEntry {
  item: CatalogGalleryItem
  sourceIndex: number
  mesh: Mesh
  textureRecord: TextureRecord | null
  opacity: number
  waveTime: number
  speed: number
  offset: number
  depth: number
  screenX: number
  screenY: number
  screenHalfWidth: number
  screenHalfHeight: number
}

interface GalleryLabelEntry {
  key: string
  title: string
}

const DESKTOP_RING_SLOTS = 7
const MOBILE_RING_SLOTS = 3
const WHEEL_SCROLL_SCALE = 0.0046
const LONG_PRESS_DELAY = 200
const PRE_DRAG_CANCEL_DISTANCE = 10

const stageRef = ref<HTMLElement | null>(null)
const canvasHostRef = ref<HTMLElement | null>(null)
const activeItem = ref<CatalogGalleryItem | null>(
  props.items.find((item) => item.id === props.activeId) ?? props.items[0] ?? null,
)
const webglFailed = ref(false)
const dragging = ref(false)
const labelItems = ref<GalleryLabelEntry[]>([])

const activeIndex = computed(() => {
  if (!activeItem.value) return -1
  return props.items.findIndex((item) => item.id === activeItem.value?.id)
})

let renderer: Renderer | null = null
let gl: OGLRenderingContext | null = null
let camera: Camera | null = null
let scene: Transform | null = null
let geometry: Plane | null = null
let sharedProgram: Program | null = null
let defaultTexture: Texture | null = null
let mediaEntries: MediaEntry[] = []
const labelElements: Array<HTMLElement | null> = []
const textureCache = new Map<string, TextureRecord>()
const domFallbackCache = new Map<number, string>()
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let animationFrame = 0
let wheelSnapTimer: number | null = null
let longPressTimer: number | null = null
let initialized = false
let componentActive = true
let intersecting = true
let reducedMotion = false
let viewportWidth = 1
let viewportHeight = 1
let planeWidth = 1
let planeHeight = 1
let itemWidth = 1
let ringSlots = DESKTOP_RING_SLOTS
let scrollCurrent = 0
let scrollTarget = 0
let pointerId: number | null = null
let pointerStartX = 0
let pointerStartY = 0
let pointerStartTarget = 0
let pointerMoved = false
let pointerLastX = 0
let pointerLastY = 0
let dragArmed = false
let pointerGestureCancelled = false
let suppressClick = false
let prefetchedItemId: number | null = null
let lastCoverRectSignature = ''
let canvasViewportLeft = 0
let canvasViewportTop = 0

const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

const vertexShader = `
  attribute vec3 position;
  attribute vec2 uv;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpeed;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;
    float innerMask = sin(uv.x * 3.14159265) * sin(uv.y * 3.14159265);
    float waveMask = 0.38 + innerMask * 0.62;
    float wave = sin(p.x * 4.0 + uTime) + cos(p.y * 3.0 + uTime * 0.82);
    p.z += wave * waveMask * (0.075 + min(abs(uSpeed), 0.22) * 0.42);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  uniform sampler2D tMap;
  uniform vec2 uImageSize;
  uniform vec2 uPlaneSize;
  uniform float uBorderRadius;
  uniform float uOpacity;
  varying vec2 vUv;

  float roundedBoxSdf(vec2 position, vec2 halfSize, float radius) {
    vec2 distanceToEdge = abs(position) - halfSize + radius;
    return min(max(distanceToEdge.x, distanceToEdge.y), 0.0)
      + length(max(distanceToEdge, 0.0)) - radius;
  }

  void main() {
    float imageAspect = uImageSize.x / max(uImageSize.y, 1.0);
    float planeAspect = uPlaneSize.x / max(uPlaneSize.y, 0.001);
    vec2 ratio = vec2(
      min(planeAspect / imageAspect, 1.0),
      min(imageAspect / planeAspect, 1.0)
    );
    vec2 imageUv = vUv * ratio + (1.0 - ratio) * 0.5;
    vec4 color = texture2D(tMap, imageUv);
    float radius = clamp(uBorderRadius, 0.0, 0.48);
    float distanceToCorner = roundedBoxSdf(vUv - 0.5, vec2(0.5), radius);
    float edgeAlpha = 1.0 - smoothstep(-0.0025, 0.0025, distanceToCorner);
    color.a *= edgeAlpha * uOpacity;
    if (color.a < 0.01) discard;
    gl_FragColor = color;
  }
`

function wrap(value: number, total: number) {
  if (total <= 0) return value
  return ((value + total * 0.5) % total + total) % total - total * 0.5
}

function createPlaceholderCanvas(item: CatalogGalleryItem) {
  const canvas = document.createElement('canvas')
  const ratio = Math.max(0.45, props.aspectRatio)
  canvas.width = Math.round(640 * ratio)
  canvas.height = 640
  const context = canvas.getContext('2d')
  if (!context) return canvas
  context.fillStyle = '#070707'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = 'rgba(255,255,255,0.18)'
  context.lineWidth = 2
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `400 ${Math.max(34, Math.round(canvas.width * 0.12))}px Cinzel, serif`
  context.fillText('DUMB', canvas.width * 0.5, canvas.height * 0.46)
  context.fillStyle = 'rgba(255,255,255,0.48)'
  context.font = `600 ${Math.max(14, Math.round(canvas.width * 0.034))}px Inter, sans-serif`
  context.fillText(item.eyebrow.split(' / ')[0] || 'SIGNAL', canvas.width * 0.5, canvas.height * 0.57)
  return canvas
}

function textureKey(item: CatalogGalleryItem) {
  return item.imageUrl || `fallback:${item.id}:${item.eyebrow}`
}

function getTexture(item: CatalogGalleryItem) {
  if (!gl) throw new Error('Gallery context is unavailable')
  const key = textureKey(item)
  const cached = textureCache.get(key)
  if (cached) return cached

  const placeholder = createPlaceholderCanvas(item)
  const texture = new Texture(gl, {
    image: placeholder,
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
  })
  const record: TextureRecord = { key, texture, image: placeholder }
  textureCache.set(key, record)

  if (item.imageUrl) {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.decoding = 'async'
    image.onload = () => {
      const current = textureCache.get(key)
      if (!current || current.texture !== texture) return
      current.image = image
      texture.image = image
      texture.needsUpdate = true
      renderOnce()
    }
    image.onerror = () => {
      image.onload = null
      image.onerror = null
    }
    image.src = item.imageUrl
  }
  return record
}

function disposeMediaEntries() {
  mediaEntries.forEach((entry) => {
    entry.mesh.setParent(null)
  })
  mediaEntries = []
  labelItems.value = []
  labelElements.length = 0
}

function setLabelElement(index: number, element: unknown) {
  labelElements[index] = element instanceof HTMLElement ? element : null
}

function disposeUnusedTextures(validKeys: Set<string>) {
  if (!gl) return
  textureCache.forEach((record, key) => {
    if (validKeys.has(key)) return
    if (record.image instanceof HTMLImageElement) {
      record.image.onload = null
      record.image.onerror = null
    }
    gl?.deleteTexture(record.texture.texture)
    textureCache.delete(key)
  })
}

function setActiveItem(item: CatalogGalleryItem | null) {
  if (!item) {
    activeItem.value = null
    return
  }
  if (activeItem.value?.id === item.id) return
  activeItem.value = item
  emit('active-change', item)
}

function getEntryCoverRect(entry: MediaEntry): CatalogCoverRect | null {
  if (!canvasHostRef.value) return null
  return {
    left: canvasViewportLeft + entry.screenX - entry.screenHalfWidth,
    top: canvasViewportTop + entry.screenY - entry.screenHalfHeight,
    width: entry.screenHalfWidth * 2,
    height: entry.screenHalfHeight * 2,
  }
}

function emitActiveCoverRect(entry: MediaEntry) {
  if (Math.abs(entry.offset) > 0.08 || Math.abs(scrollTarget - scrollCurrent) > 0.02) return
  const rect = getEntryCoverRect(entry)
  if (!rect) return
  const signature = `${entry.item.id}:${Math.round(rect.left)}:${Math.round(rect.top)}:${Math.round(rect.width)}:${Math.round(rect.height)}`
  if (signature === lastCoverRectSignature) return
  lastCoverRectSignature = signature
  emit('cover-rect', { item: entry.item, rect })
}

function prefetchItem(item: CatalogGalleryItem | null) {
  if (!item) return
  if (prefetchedItemId === item.id) return
  prefetchedItemId = item.id
  emit('prefetch', item)
}

function buildMedia() {
  const previousId = props.activeId ?? activeItem.value?.id
  disposeMediaEntries()
  if (!gl || !scene || !geometry || !sharedProgram || props.items.length === 0) {
    setActiveItem(props.items[0] ?? null)
    return
  }

  const validKeys = new Set(props.items.map(textureKey))
  disposeUnusedTextures(validKeys)
  const repeatCount = props.items.length === 1
    ? 1
    : Math.max(1, Math.ceil(DESKTOP_RING_SLOTS / props.items.length))
  const repeatedItems = Array.from({ length: props.items.length * repeatCount }, (_, index) => ({
    item: props.items[index % props.items.length]!,
    sourceIndex: index % props.items.length,
  }))

  labelItems.value = repeatedItems.map(({ item }, index) => ({
    key: `${item.id}:${index}`,
    title: item.title,
  }))

  repeatedItems.forEach(({ item, sourceIndex }) => {
    const mesh = new Mesh(gl!, { geometry: geometry!, program: sharedProgram! })
    const entry: MediaEntry = {
      item,
      sourceIndex,
      mesh,
      textureRecord: null,
      opacity: 0,
      waveTime: Math.random() * 20,
      speed: 0,
      offset: 0,
      depth: 0,
      screenX: 0,
      screenY: 0,
      screenHalfWidth: 0,
      screenHalfHeight: 0,
    }
    mesh.visible = false
    mesh.onBeforeRender(() => {
      if (!sharedProgram || !defaultTexture) return
      const record = entry.textureRecord
      const image = record?.image
      const imageWidth = image instanceof HTMLImageElement ? image.naturalWidth || 1 : image?.width || 1
      const imageHeight = image instanceof HTMLImageElement ? image.naturalHeight || 1 : image?.height || 1
      sharedProgram.uniforms.tMap.value = record?.texture ?? defaultTexture
      sharedProgram.uniforms.uImageSize.value = [imageWidth, imageHeight]
      sharedProgram.uniforms.uPlaneSize.value = [planeWidth, planeHeight]
      sharedProgram.uniforms.uBorderRadius.value = props.borderRadius
      sharedProgram.uniforms.uOpacity.value = entry.opacity
      sharedProgram.uniforms.uTime.value = entry.waveTime
      sharedProgram.uniforms.uSpeed.value = entry.speed
    })
    mesh.setParent(scene!)
    mediaEntries.push(entry)
  })

  const nextIndex = Math.max(0, props.items.findIndex((item) => item.id === previousId))
  activeItem.value = props.items[nextIndex] ?? null
  scrollCurrent = nextIndex * itemWidth
  scrollTarget = scrollCurrent
  if (activeItem.value) emit('active-change', activeItem.value)
  updateMediaPositions()
  renderOnce()
}

function resize() {
  const container = canvasHostRef.value
  if (!container || !renderer || !camera) return
  const bounds = container.getBoundingClientRect()
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  canvasViewportLeft = bounds.left
  canvasViewportTop = bounds.top
  renderer.dpr = Math.min(window.devicePixelRatio, width <= 760 ? 1 : 1.25)
  renderer.setSize(width, height)
  camera.perspective({ aspect: width / height })
  viewportHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z
  viewportWidth = viewportHeight * (width / height)

  const compact = width <= 760
  ringSlots = compact ? MOBILE_RING_SLOTS : DESKTOP_RING_SLOTS
  planeHeight = compact
    ? (props.aspectRatio >= 0.9 ? 3.4 : 4.2)
    : (props.aspectRatio >= 0.9 ? 4.2 : 5)
  planeWidth = planeHeight * props.aspectRatio
  itemWidth = 1
  mediaEntries.forEach((entry) => {
    entry.mesh.scale.set(planeWidth, planeHeight, 1)
  })
  updateMediaPositions()
  renderOnce()
}

function ensureEntryTexture(entry: MediaEntry) {
  const key = textureKey(entry.item)
  if (entry.textureRecord?.key === key) return
  entry.textureRecord = getTexture(entry.item)
}

function updateMediaPositions() {
  if (!canvasHostRef.value || mediaEntries.length === 0) return
  const totalWidth = mediaEntries.length * itemWidth
  let nearestEntry: MediaEntry | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  const stageWidth = canvasHostRef.value.clientWidth
  const stageHeight = canvasHostRef.value.clientHeight
  const radiusX = viewportWidth * (stageWidth <= 760 ? 0.33 : 0.415)
  const bendScale = Math.max(0.6, Math.min(1.25, props.bend / 10))
  const radiusY = viewportHeight * (stageWidth <= 760 ? 0.43 : 0.47) * bendScale
  const centerY = -viewportHeight * (stageWidth <= 760 ? 0.23 : 0.27)
  const visibleRadius = Math.floor(ringSlots / 2)

  mediaEntries.forEach((entry, index) => {
    const offset = mediaEntries.length === 1
      ? 0
      : wrap(index * itemWidth - scrollCurrent, totalWidth) / itemWidth
    const visible = mediaEntries.length === 1 || Math.abs(offset) <= visibleRadius + 0.52
    const normalizedOffset = Math.max(-1, Math.min(1, offset / visibleRadius))
    const arcHeight = Math.sqrt(Math.max(0, 1 - normalizedOffset * normalizedOffset))
    const activeWeight = Math.max(0, 1 - Math.abs(offset))
    const scale = 1.2 + activeWeight * 0.1
    const edgePresence = Math.max(0, Math.min(1, (visibleRadius + 0.5 - Math.abs(offset)) * 2))
    const baseOpacity = visible ? (0.72 + activeWeight * 0.28) * edgePresence : 0
    const opacity = entry.item.id === props.transitioningItemId ? 0 : baseOpacity
    const x = normalizedOffset * radiusX
    const y = centerY + arcHeight * radiusY
    const depth = activeWeight * 0.6

    entry.offset = offset
    entry.depth = depth
    entry.mesh.position.set(x, y, depth)
    entry.mesh.rotation.z = 0
    entry.mesh.rotation.y = 0
    entry.mesh.scale.set(planeWidth * scale, planeHeight * scale, 1)
    entry.mesh.visible = visible
    entry.opacity = opacity
    if (Math.abs(offset) <= visibleRadius + 1.25) ensureEntryTexture(entry)

    const perspective = 20 / (20 - entry.mesh.position.z)
    entry.screenX = stageWidth * 0.5 + x * (stageWidth / viewportWidth) * perspective
    entry.screenY = stageHeight * 0.5 - entry.mesh.position.y * (stageHeight / viewportHeight) * perspective
    entry.screenHalfWidth = planeWidth * scale * (stageWidth / viewportWidth) * perspective * 0.5
    entry.screenHalfHeight = planeHeight * scale * (stageHeight / viewportHeight) * perspective * 0.5

    const label = labelElements[index]
    if (label) {
      if (opacity <= 0.01) {
        if (label.style.opacity !== '0') label.style.opacity = '0'
      } else {
        label.style.opacity = String(opacity)
        label.style.zIndex = String(Math.round((depth + 2) * 100))
        label.style.transform = `translate3d(${entry.screenX}px, ${entry.screenY + entry.screenHalfHeight + 9}px, 0) translateX(-50%)`
      }
    }

    const distance = Math.abs(offset)
    if (baseOpacity > 0.1 && distance < nearestDistance) {
      nearestDistance = distance
      nearestEntry = entry
    }
  })

  if (nearestEntry) {
    const entry = nearestEntry as MediaEntry
    setActiveItem(entry.item)
    emitActiveCoverRect(entry)
  }
  if (totalWidth > 0 && Math.abs(scrollCurrent) > totalWidth * 40) {
    scrollCurrent %= totalWidth
    scrollTarget %= totalWidth
  }
}

function renderOnce() {
  if (!renderer || !scene || !camera || webglFailed.value) return
  updateMediaPositions()
  renderer.render({ scene, camera, sort: true, frustumCull: true })
}

function animate() {
  animationFrame = 0
  if (!componentActive || !intersecting || document.hidden || webglFailed.value) return
  const ease = reducedMotion ? 1 : props.scrollEase
  const previousScroll = scrollCurrent
  scrollCurrent += (scrollTarget - scrollCurrent) * ease
  if (Math.abs(scrollTarget - scrollCurrent) < 0.0005) scrollCurrent = scrollTarget
  const scrollSpeed = scrollCurrent - previousScroll
  if (!reducedMotion) {
    const time = performance.now() * 0.0016
    mediaEntries.forEach((entry, index) => {
      if (!entry.mesh.visible) return
      entry.waveTime = time + index * 0.37
      entry.speed += (scrollSpeed - entry.speed) * 0.12
    })
  }
  renderOnce()
  animationFrame = requestAnimationFrame(animate)
}

function updateAnimationState() {
  if (!initialized) return
  if (componentActive && intersecting && !document.hidden && !webglFailed.value) {
    if (!animationFrame) animationFrame = requestAnimationFrame(animate)
    return
  }
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
}

function resumeInteraction() {
  const stage = stageRef.value
  if (!stage?.isConnected) return false
  const wasPaused = !componentActive || !intersecting
  componentActive = true
  intersecting = true
  if (wasPaused) {
    resize()
    renderOnce()
  }
  updateAnimationState()
  return true
}

function snapToNearest() {
  if (props.items.length <= 1 || !itemWidth) return
  scrollTarget = Math.round(scrollTarget / itemWidth) * itemWidth
}

function navigate(direction: -1 | 1) {
  if (props.items.length <= 1) return
  scrollTarget = scrollCurrent + itemWidth * direction
  snapToNearest()
  updateAnimationState()
  if (reducedMotion) {
    scrollCurrent = scrollTarget
    renderOnce()
  }
}

function handleWheel(event: WheelEvent) {
  if (!resumeInteraction() || props.interactionLocked || props.items.length <= 1) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  scrollTarget += delta * WHEEL_SCROLL_SCALE * props.scrollSpeed
  if (wheelSnapTimer !== null) window.clearTimeout(wheelSnapTimer)
  wheelSnapTimer = window.setTimeout(() => {
    snapToNearest()
    wheelSnapTimer = null
  }, 140)
}

function clearLongPressTimer() {
  if (longPressTimer !== null) window.clearTimeout(longPressTimer)
  longPressTimer = null
}

function releasePointerCapture(id: number) {
  const stage = stageRef.value
  if (stage?.hasPointerCapture(id)) stage.releasePointerCapture(id)
}

function handlePointerDown(event: PointerEvent) {
  if (!resumeInteraction() || props.interactionLocked || event.button !== 0 || props.items.length === 0) return
  clearLongPressTimer()
  pointerId = event.pointerId
  pointerStartX = event.clientX
  pointerStartY = event.clientY
  pointerLastX = event.clientX
  pointerLastY = event.clientY
  pointerStartTarget = scrollTarget
  pointerMoved = false
  dragArmed = false
  pointerGestureCancelled = false
  suppressClick = false
  dragging.value = false
  stageRef.value?.setPointerCapture(event.pointerId)
  const pressedPointerId = event.pointerId
  longPressTimer = window.setTimeout(() => {
    longPressTimer = null
    if (pointerId !== pressedPointerId || pointerGestureCancelled) return
    dragArmed = true
    pointerStartX = pointerLastX
    pointerStartY = pointerLastY
    pointerStartTarget = scrollTarget
    dragging.value = true
  }, LONG_PRESS_DELAY)
}

function handlePointerMove(event: PointerEvent) {
  if (!resumeInteraction() || props.interactionLocked) return
  if (pointerId === null) {
    const hovered = findHitEntry(event.clientX, event.clientY)
    if (hovered && Math.abs(hovered.offset) < 0.18) prefetchItem(hovered.item)
    return
  }
  if (pointerId !== event.pointerId || !stageRef.value) return
  pointerLastX = event.clientX
  pointerLastY = event.clientY
  const deltaX = event.clientX - pointerStartX
  const deltaY = event.clientY - pointerStartY
  if (!dragArmed) {
    if (Math.hypot(deltaX, deltaY) > PRE_DRAG_CANCEL_DISTANCE) {
      suppressClick = true
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        pointerGestureCancelled = true
        clearLongPressTimer()
        releasePointerCapture(event.pointerId)
        pointerId = null
      }
    }
    return
  }
  if (Math.hypot(deltaX, deltaY) > 4) {
    pointerMoved = true
    suppressClick = true
    dragging.value = true
  }
  if (!pointerMoved || props.items.length <= 1) return
  event.preventDefault()
  scrollTarget = pointerStartTarget - (deltaX / Math.max(stageRef.value.clientWidth, 1))
    * ringSlots * 0.72 * props.scrollSpeed
}

function findHitEntry(clientX: number, clientY: number) {
  if (!canvasHostRef.value) return null
  const x = clientX - canvasViewportLeft
  const y = clientY - canvasViewportTop
  const candidates = mediaEntries.filter((entry) => (
    Math.abs(x - entry.screenX) <= entry.screenHalfWidth
      && Math.abs(y - entry.screenY) <= entry.screenHalfHeight
      && entry.opacity > 0.1
  ))
  return candidates.sort((a, b) => b.depth - a.depth)[0] ?? null
}

function findCenteredEntry() {
  return mediaEntries
    .filter((entry) => entry.opacity > 0.1)
    .sort((first, second) => Math.abs(first.offset) - Math.abs(second.offset))[0] ?? null
}

function centerEntry(entry: MediaEntry) {
  scrollTarget = scrollCurrent + entry.offset * itemWidth
  snapToNearest()
  if (reducedMotion) {
    scrollCurrent = scrollTarget
    renderOnce()
  }
}

function handlePointerUp(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  clearLongPressTimer()
  releasePointerCapture(event.pointerId)
  const wasMoved = pointerMoved
  const wasCancelled = pointerGestureCancelled
  pointerId = null
  pointerMoved = false
  dragArmed = false
  pointerGestureCancelled = false
  dragging.value = false
  suppressClick = suppressClick || wasCancelled || wasMoved
  if (suppressClick) {
    snapToNearest()
  }
}

function handleClick(event: MouseEvent) {
  if (!resumeInteraction() || props.interactionLocked) return
  if (suppressClick) {
    suppressClick = false
    return
  }
  const hit = findHitEntry(event.clientX, event.clientY)
  if (!hit) return
  const isCentered = hit === findCenteredEntry()
  const rect = getEntryCoverRect(hit)
  if (isCentered && rect) emit('open', { item: hit.item, rect })
  else centerEntry(hit)
}

function handleContextMenu(event: MouseEvent) {
  if (pointerId !== null) event.preventDefault()
}

function handlePointerCancel(event: PointerEvent) {
  if (pointerId !== event.pointerId) return
  clearLongPressTimer()
  pointerId = null
  pointerMoved = false
  dragArmed = false
  pointerGestureCancelled = false
  suppressClick = true
  dragging.value = false
  snapToNearest()
}

function handleKeydown(event: KeyboardEvent) {
  if (!resumeInteraction() || props.interactionLocked) return
  if (event.key === 'ArrowRight') {
    event.preventDefault()
    navigate(1)
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    navigate(-1)
  } else if ((event.key === 'Enter' || event.key === ' ') && activeItem.value) {
    event.preventDefault()
    openActive()
  }
}

function handleFallbackClick(item: CatalogGalleryItem, event: MouseEvent) {
  if (activeItem.value?.id === item.id) {
    const image = (event.currentTarget as HTMLElement).querySelector('img')
    const bounds = image?.getBoundingClientRect()
    if (bounds) {
      emit('open', {
        item,
        rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
      })
    }
    return
  }
  setActiveItem(item)
  ;(event.currentTarget as HTMLElement).scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'nearest',
    inline: 'center',
  })
}

function fallbackImage(item: CatalogGalleryItem) {
  const cached = domFallbackCache.get(item.id)
  if (cached) return cached
  const value = createPlaceholderCanvas(item).toDataURL('image/png')
  domFallbackCache.set(item.id, value)
  return value
}

function handleDomImageError(event: Event, item: CatalogGalleryItem) {
  const image = event.currentTarget as HTMLImageElement
  image.onerror = null
  image.src = fallbackImage(item)
}

function openActive() {
  if (!activeItem.value) return
  const entry = mediaEntries
    .filter((candidate) => candidate.item.id === activeItem.value?.id)
    .sort((first, second) => Math.abs(first.offset) - Math.abs(second.offset))[0]
  const rect = entry ? getEntryCoverRect(entry) : null
  if (rect) emit('open', { item: activeItem.value, rect })
}

function handleVisibilityChange() {
  updateAnimationState()
}

function handleMotionPreference(event: MediaQueryListEvent) {
  reducedMotion = event.matches
  if (reducedMotion) {
    scrollCurrent = scrollTarget
    renderOnce()
  }
  updateAnimationState()
}

function handleContextLost(event: Event) {
  event.preventDefault()
  webglFailed.value = true
  updateAnimationState()
}

function initialize() {
  const host = canvasHostRef.value
  if (!host) return
  try {
    reducedMotion = motionPreference.matches
    renderer = new Renderer({
      alpha: true,
      antialias: true,
      depth: true,
      dpr: Math.min(window.devicePixelRatio, 1.25),
    })
    gl = renderer.gl
    gl.clearColor(0, 0, 0, 0)
    gl.canvas.className = 'circular-gallery-canvas'
    gl.canvas.setAttribute('aria-hidden', 'true')
    gl.canvas.addEventListener('webglcontextlost', handleContextLost)
    host.appendChild(gl.canvas)

    camera = new Camera(gl, { fov: 45, near: 0.1, far: 100 })
    camera.position.z = 20
    scene = new Transform()
    geometry = new Plane(gl, { widthSegments: 16, heightSegments: 16 })
    const defaultCanvas = document.createElement('canvas')
    defaultCanvas.width = 1
    defaultCanvas.height = 1
    defaultCanvas.getContext('2d')?.fillRect(0, 0, 1, 1)
    defaultTexture = new Texture(gl, {
      image: defaultCanvas,
      generateMipmaps: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR,
    })
    sharedProgram = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        tMap: { value: defaultTexture },
        uImageSize: { value: [1, 1] },
        uPlaneSize: { value: [1, 1] },
        uBorderRadius: { value: props.borderRadius },
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uSpeed: { value: 0 },
      },
    })
    initialized = true

    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(host)
    intersectionObserver = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? true
      updateAnimationState()
    }, { rootMargin: '80px' })
    intersectionObserver.observe(host)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    motionPreference.addEventListener('change', handleMotionPreference)
    resize()
    buildMedia()
    updateAnimationState()
  } catch (error) {
    console.warn('Circular gallery could not initialize.', error)
    webglFailed.value = true
  }
}

function dispose() {
  initialized = false
  if (animationFrame) cancelAnimationFrame(animationFrame)
  if (wheelSnapTimer !== null) window.clearTimeout(wheelSnapTimer)
  clearLongPressTimer()
  animationFrame = 0
  wheelSnapTimer = null
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  resizeObserver = null
  intersectionObserver = null
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  motionPreference.removeEventListener('change', handleMotionPreference)
  renderer?.gl.canvas.removeEventListener('webglcontextlost', handleContextLost)
  disposeMediaEntries()
  textureCache.forEach((record) => gl?.deleteTexture(record.texture.texture))
  textureCache.clear()
  if (defaultTexture) gl?.deleteTexture(defaultTexture.texture)
  sharedProgram?.remove()
  geometry?.remove()
  const canvas = renderer?.gl.canvas
  const loseContext = renderer?.gl.getExtension('WEBGL_lose_context')
  loseContext?.loseContext()
  canvas?.remove()
  renderer = null
  gl = null
  camera = null
  scene = null
  geometry = null
  sharedProgram = null
  defaultTexture = null
}

watch(() => props.items, () => {
  domFallbackCache.clear()
  buildMedia()
})

watch(() => props.activeId, (id) => {
  if (!id || activeItem.value?.id === id || props.items.length === 0) return
  const index = props.items.findIndex((item) => item.id === id)
  if (index < 0) return
  scrollTarget = index * itemWidth
  scrollCurrent = scrollTarget
  setActiveItem(props.items[index] ?? null)
  renderOnce()
})

watch(() => [props.aspectRatio, props.borderRadius], () => {
  resize()
  renderOnce()
})

watch(() => props.transitioningItemId, () => {
  renderOnce()
})

onMounted(initialize)
onActivated(() => {
  componentActive = true
  intersecting = true
  suppressClick = false
  void nextTick(() => {
    if (!initialized) return
    lastCoverRectSignature = ''
    resize()
    renderOnce()
    updateAnimationState()
  })
})
onDeactivated(() => {
  componentActive = false
  clearLongPressTimer()
  if (pointerId !== null) releasePointerCapture(pointerId)
  pointerId = null
  pointerMoved = false
  dragArmed = false
  pointerGestureCancelled = false
  suppressClick = false
  dragging.value = false
  if (wheelSnapTimer !== null) window.clearTimeout(wheelSnapTimer)
  wheelSnapTimer = null
  updateAnimationState()
})
onBeforeUnmount(dispose)
</script>

<template>
  <section
    class="circular-gallery"
    :class="{ dragging, fallback: webglFailed, locked: interactionLocked }"
  >
    <div
      ref="stageRef"
      class="gallery-stage"
      role="region"
      tabindex="0"
      aria-label="循环内容画廊。使用左右方向键浏览，按 Enter 或空格打开当前内容。"
      @wheel.passive="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @click="handleClick"
      @contextmenu="handleContextMenu"
      @keydown="handleKeydown"
    >
      <div ref="canvasHostRef" class="canvas-host" />

      <div v-if="!webglFailed" class="gallery-label-layer" aria-hidden="true">
        <span
          v-for="(label, index) in labelItems"
          :key="label.key"
          :ref="(element) => setLabelElement(index, element)"
          class="gallery-cover-label"
        >
          {{ label.title }}
        </span>
      </div>

      <div v-if="webglFailed" class="fallback-strip">
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          class="fallback-item"
          :class="{ active: activeItem?.id === item.id }"
          @click.stop="handleFallbackClick(item, $event)"
        >
          <img :src="item.imageUrl || fallbackImage(item)" alt="" @error="handleDomImageError($event, item)" loading="lazy" decoding="async"/>
          <span>{{ item.title }}</span>
        </button>
      </div>

      <div v-if="activeItem" class="gallery-detail" aria-live="polite">
        <div class="detail-copy">
          <p class="detail-eyebrow">{{ activeItem.eyebrow }}</p>
          <h2 class="sr-only">{{ activeItem.title }}</h2>
        </div>
        <div class="detail-meta">
          <div>
            <span>{{ activeItem.metaLabel }}</span>
            <p>{{ activeItem.meta }}</p>
          </div>
          <div class="detail-score">
            <span>SCORE</span>
            <p>{{ activeItem.score }}</p>
          </div>
        </div>
        <button
          type="button"
          class="detail-action"
          @pointerdown.stop
          @pointerenter="prefetchItem(activeItem)"
          @focus="prefetchItem(activeItem)"
          @click.stop="openActive"
        >
          <span>VIEW</span>
          <el-icon><ArrowRight /></el-icon>
        </button>
        <p class="detail-index" aria-hidden="true">
          {{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(items.length).padStart(2, '0') }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.circular-gallery {
  position: relative;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.gallery-stage {
  position: relative;
  height: 100%;
  min-height: 0;
  margin-top: 4px;
  overflow: hidden;
  outline: none;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.gallery-stage:focus-visible .detail-action {
  border-bottom-color: #fff;
  color: #fff;
}

.dragging .gallery-stage {
  cursor: grabbing;
  user-select: none;
}

.locked .gallery-stage {
  pointer-events: none;
}

.canvas-host,
.gallery-label-layer,
.fallback-strip {
  position: absolute;
  inset: 0;
}

.gallery-label-layer {
  z-index: 2;
  overflow: hidden;
  pointer-events: none;
}

.gallery-cover-label {
  position: absolute;
  top: 0;
  left: 0;
  display: -webkit-box;
  width: clamp(92px, 11vw, 180px);
  overflow: hidden;
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.81rem;
  font-weight: 500;
  line-height: 1.25;
  letter-spacing: 0;
  text-align: center;
  text-overflow: ellipsis;
  text-shadow: 0 2px 12px #000;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  will-change: transform, opacity;
}

.canvas-host :deep(.circular-gallery-canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.fallback-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 44px;
  overflow-x: auto;
  scrollbar-width: none;
}

.fallback-strip::-webkit-scrollbar {
  display: none;
}

.fallback-item {
  flex: 0 0 min(62vw, 260px);
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.58);
  cursor: pointer;
  font: inherit;
  text-align: left;
  opacity: 0.48;
  transition: opacity 180ms ease;
}

.fallback-item.active,
.fallback-item:focus-visible {
  opacity: 1;
  outline: none;
}

.fallback-item img {
  display: block;
  width: 100%;
  aspect-ratio: v-bind(aspectRatio);
  object-fit: cover;
  border-radius: 4px;
}

.fallback-item span {
  display: block;
  margin-top: 10px;
  overflow: hidden;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-detail {
  position: absolute;
  top: 75%;
  left: 50%;
  z-index: 3;
  display: grid;
  width: min(340px, 34vw);
  justify-items: center;
  gap: 14px;
  color: #fff;
  text-align: center;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.9);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.detail-copy,
.detail-meta,
.detail-meta > div {
  min-width: 0;
}

.detail-eyebrow,
.detail-meta span,
.detail-index {
  margin: 0;
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.detail-meta {
  display: flex;
  max-width: 100%;
  align-items: flex-start;
  justify-content: center;
  gap: 28px;
}

.detail-meta > div {
  max-width: 190px;
}

.detail-meta p {
  margin: 6px 0 0;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.78);
  font-size: 0.99rem;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-score {
  flex: 0 0 auto;
}

.detail-score p {
  color: #fff;
  font-family: 'Cinzel', serif;
  font-size: 1.37rem;
  font-weight: 500;
}

.detail-action {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.44);
  background: transparent;
  color: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  font: inherit;
  font-size: 0.83rem;
  font-weight: 600;
  letter-spacing: 0;
  white-space: nowrap;
  pointer-events: auto;
  transition: color 180ms ease, border-color 180ms ease;
}

.detail-action:hover,
.detail-action:focus-visible {
  border-color: #fff;
  color: #fff;
  outline: none;
}

.detail-index {
  margin-top: -5px;
}

@media (max-width: 760px) {
  .gallery-stage {
    margin-top: 0;
  }

  .gallery-detail {
    top: 72%;
    width: min(230px, 62vw);
    gap: 11px;
  }

  .detail-copy {
    width: 100%;
  }

  .gallery-cover-label {
    width: 92px;
    font-size: 0.73rem;
  }

  .detail-meta {
    gap: 18px;
  }

  .detail-meta p {
    max-width: 130px;
    font-size: 0.88rem;
  }

  .detail-action {
    padding: 6px 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fallback-item,
  .detail-action {
    transition: none;
  }
}
</style>
