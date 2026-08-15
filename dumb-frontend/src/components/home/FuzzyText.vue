<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

type FuzzyDirection = 'horizontal' | 'vertical' | 'both'

interface Props {
  text: string
  fontSize?: number | string
  fontWeight?: number | string
  fontFamily?: string
  color?: string
  enableHover?: boolean
  baseIntensity?: number
  hoverIntensity?: number
  fuzzRange?: number
  fps?: number
  direction?: FuzzyDirection
  transitionDuration?: number
  clickEffect?: boolean
  glitchMode?: boolean
  glitchInterval?: number
  glitchDuration?: number
  gradient?: string[] | null
  letterSpacing?: number
  className?: string
}

const props = withDefaults(defineProps<Props>(), {
  fontSize: 'clamp(2rem, 10vw, 10rem)',
  fontWeight: 900,
  fontFamily: 'inherit',
  color: '#fff',
  enableHover: true,
  baseIntensity: 0.18,
  hoverIntensity: 0.5,
  fuzzRange: 30,
  fps: 60,
  direction: 'horizontal',
  transitionDuration: 0,
  clickEffect: false,
  glitchMode: false,
  glitchInterval: 2000,
  glitchDuration: 200,
  gradient: null,
  letterSpacing: 0,
  className: '',
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')

let initializationToken = 0
let resizeTimer: number | null = null
let disposeRenderer: (() => void) | null = null

function resolveFontSize(value: number | string, family: string) {
  if (typeof value === 'number') return value
  const probe = document.createElement('span')
  probe.style.position = 'fixed'
  probe.style.visibility = 'hidden'
  probe.style.pointerEvents = 'none'
  probe.style.fontFamily = family
  probe.style.fontSize = value
  probe.textContent = 'M'
  document.body.appendChild(probe)
  const size = Number.parseFloat(window.getComputedStyle(probe).fontSize)
  probe.remove()
  return Number.isFinite(size) ? size : 64
}

function scheduleInitialization() {
  if (resizeTimer !== null) window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    resizeTimer = null
    void initialize()
  }, 80)
}

async function initialize() {
  const token = ++initializationToken
  disposeRenderer?.()
  disposeRenderer = null

  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  const computedFamily = props.fontFamily === 'inherit'
    ? window.getComputedStyle(canvas).fontFamily || 'sans-serif'
    : props.fontFamily
  const numericFontSize = resolveFontSize(props.fontSize, computedFamily)
  const font = `${props.fontWeight} ${numericFontSize}px ${computedFamily}`

  try {
    await document.fonts.load(font)
  } catch {
    await document.fonts.ready
  }
  if (token !== initializationToken || !canvas.isConnected) return

  const textCanvas = document.createElement('canvas')
  const textContext = textCanvas.getContext('2d')
  if (!textContext) return
  textContext.font = font
  textContext.textBaseline = 'alphabetic'

  let measuredWidth = 0
  if (props.letterSpacing !== 0) {
    for (const character of props.text) {
      measuredWidth += textContext.measureText(character).width + props.letterSpacing
    }
    measuredWidth = Math.max(0, measuredWidth - props.letterSpacing)
  } else {
    measuredWidth = textContext.measureText(props.text).width
  }

  const metrics = textContext.measureText(props.text)
  const actualLeft = metrics.actualBoundingBoxLeft || 0
  const actualRight = props.letterSpacing !== 0
    ? measuredWidth
    : metrics.actualBoundingBoxRight || metrics.width
  const ascent = metrics.actualBoundingBoxAscent || numericFontSize
  const descent = metrics.actualBoundingBoxDescent || numericFontSize * 0.2
  const textWidth = Math.max(1, Math.ceil(props.letterSpacing !== 0
    ? measuredWidth
    : actualLeft + actualRight))
  const textHeight = Math.max(1, Math.ceil(ascent + descent))
  const textPadding = 6

  textCanvas.width = textWidth + textPadding * 2
  textCanvas.height = textHeight
  textContext.font = font
  textContext.textBaseline = 'alphabetic'
  if (props.gradient && props.gradient.length >= 2) {
    const gradient = textContext.createLinearGradient(0, 0, textCanvas.width, 0)
    props.gradient.forEach((color, index) => {
      gradient.addColorStop(index / (props.gradient!.length - 1), color)
    })
    textContext.fillStyle = gradient
  } else {
    textContext.fillStyle = props.color
  }

  if (props.letterSpacing !== 0) {
    let position = textPadding
    for (const character of props.text) {
      textContext.fillText(character, position, ascent)
      position += textContext.measureText(character).width + props.letterSpacing
    }
  } else {
    textContext.fillText(props.text, textPadding - actualLeft, ascent)
  }

  const horizontalMargin = props.direction === 'vertical' ? 8 : props.fuzzRange + 20
  const verticalMargin = props.direction === 'horizontal' ? 4 : Math.ceil(props.fuzzRange * 0.5) + 10
  const displayWidth = textCanvas.width + horizontalMargin * 2
  const displayHeight = textCanvas.height + verticalMargin * 2
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

  canvas.width = Math.ceil(displayWidth * pixelRatio)
  canvas.height = Math.ceil(displayHeight * pixelRatio)
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

  const frameCanvas = document.createElement('canvas')
  frameCanvas.width = displayWidth
  frameCanvas.height = displayHeight
  const frameContext = frameCanvas.getContext('2d')
  const passCanvas = document.createElement('canvas')
  passCanvas.width = displayWidth
  passCanvas.height = displayHeight
  const passContext = passCanvas.getContext('2d')
  if (!frameContext || !passContext) return
  const outputContext = context
  const outputFrameContext = frameContext
  const outputPassContext = passContext

  let animationFrame = 0
  let glitchTimer: number | null = null
  let glitchEndTimer: number | null = null
  let clickTimer: number | null = null
  let hovering = false
  let clicking = false
  let glitching = false
  let currentIntensity = props.baseIntensity
  let lastFrameTime = 0
  let disposed = false
  const frameDuration = 1000 / Math.max(1, props.fps)

  function renderFrame(intensity: number) {
    outputFrameContext.clearRect(0, 0, displayWidth, displayHeight)
    outputPassContext.clearRect(0, 0, displayWidth, displayHeight)

    if (props.direction === 'horizontal') {
      for (let row = 0; row < textCanvas.height; row += 1) {
        const offsetX = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange)
        outputFrameContext.drawImage(
          textCanvas, 0, row, textCanvas.width, 1,
          horizontalMargin + offsetX, verticalMargin + row, textCanvas.width, 1,
        )
      }
    } else if (props.direction === 'vertical') {
      for (let column = 0; column < textCanvas.width; column += 1) {
        const offsetY = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange)
        outputFrameContext.drawImage(
          textCanvas, column, 0, 1, textCanvas.height,
          horizontalMargin + column, verticalMargin + offsetY, 1, textCanvas.height,
        )
      }
    } else {
      for (let row = 0; row < textCanvas.height; row += 1) {
        const offsetX = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange)
        outputPassContext.drawImage(
          textCanvas, 0, row, textCanvas.width, 1,
          horizontalMargin + offsetX, verticalMargin + row, textCanvas.width, 1,
        )
      }
      for (let column = 0; column < displayWidth; column += 1) {
        const offsetY = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange * 0.5)
        outputFrameContext.drawImage(
          passCanvas, column, 0, 1, displayHeight,
          column, offsetY, 1, displayHeight,
        )
      }
    }

    outputContext.clearRect(0, 0, displayWidth, displayHeight)
    outputContext.drawImage(frameCanvas, 0, 0)
  }

  function scheduleGlitch() {
    if (!props.glitchMode || motionPreference.matches || disposed) return
    glitchTimer = window.setTimeout(() => {
      glitching = true
      glitchEndTimer = window.setTimeout(() => {
        glitching = false
        scheduleGlitch()
      }, props.glitchDuration)
    }, props.glitchInterval)
  }

  function animate(timestamp: number) {
    if (disposed) return
    if (timestamp - lastFrameTime < frameDuration) {
      animationFrame = requestAnimationFrame(animate)
      return
    }
    lastFrameTime = timestamp

    const targetIntensity = clicking || glitching
      ? 1
      : hovering ? props.hoverIntensity : props.baseIntensity
    if (props.transitionDuration > 0) {
      const step = frameDuration / props.transitionDuration
      currentIntensity += (targetIntensity - currentIntensity) * Math.min(1, step)
    } else {
      currentIntensity = targetIntensity
    }

    renderFrame(currentIntensity)
    animationFrame = requestAnimationFrame(animate)
  }

  const interactiveBounds = {
    left: horizontalMargin + textPadding,
    top: verticalMargin,
    right: horizontalMargin + textPadding + textWidth,
    bottom: verticalMargin + textHeight,
  }

  function handlePointerMove(event: PointerEvent) {
    if (!props.enableHover) return
    const bounds = canvas!.getBoundingClientRect()
    const scaleX = displayWidth / Math.max(bounds.width, 1)
    const scaleY = displayHeight / Math.max(bounds.height, 1)
    const x = (event.clientX - bounds.left) * scaleX
    const y = (event.clientY - bounds.top) * scaleY
    hovering = x >= interactiveBounds.left
      && x <= interactiveBounds.right
      && y >= interactiveBounds.top
      && y <= interactiveBounds.bottom
  }

  function handlePointerLeave() {
    hovering = false
  }

  function handleClick() {
    if (!props.clickEffect) return
    clicking = true
    if (clickTimer !== null) window.clearTimeout(clickTimer)
    clickTimer = window.setTimeout(() => {
      clicking = false
    }, 150)
  }

  canvas.addEventListener('pointermove', handlePointerMove)
  canvas.addEventListener('pointerleave', handlePointerLeave)
  canvas.addEventListener('pointerup', handlePointerLeave)
  canvas.addEventListener('click', handleClick)

  if (motionPreference.matches) {
    renderFrame(0)
  } else {
    scheduleGlitch()
    animationFrame = requestAnimationFrame(animate)
  }

  disposeRenderer = () => {
    disposed = true
    cancelAnimationFrame(animationFrame)
    if (glitchTimer !== null) window.clearTimeout(glitchTimer)
    if (glitchEndTimer !== null) window.clearTimeout(glitchEndTimer)
    if (clickTimer !== null) window.clearTimeout(clickTimer)
    canvas.removeEventListener('pointermove', handlePointerMove)
    canvas.removeEventListener('pointerleave', handlePointerLeave)
    canvas.removeEventListener('pointerup', handlePointerLeave)
    canvas.removeEventListener('click', handleClick)
  }
}

function handleMotionPreference() {
  void initialize()
}

watch(() => [
  props.text,
  props.fontSize,
  props.fontWeight,
  props.fontFamily,
  props.color,
  props.enableHover,
  props.baseIntensity,
  props.hoverIntensity,
  props.fuzzRange,
  props.fps,
  props.direction,
  props.transitionDuration,
  props.clickEffect,
  props.glitchMode,
  props.glitchInterval,
  props.glitchDuration,
  props.gradient,
  props.letterSpacing,
], scheduleInitialization)

onMounted(() => {
  window.addEventListener('resize', scheduleInitialization, { passive: true })
  motionPreference.addEventListener('change', handleMotionPreference)
  void initialize()
})

onBeforeUnmount(() => {
  initializationToken += 1
  if (resizeTimer !== null) window.clearTimeout(resizeTimer)
  window.removeEventListener('resize', scheduleInitialization)
  motionPreference.removeEventListener('change', handleMotionPreference)
  disposeRenderer?.()
  disposeRenderer = null
})
</script>

<template>
  <canvas ref="canvasRef" :class="className" aria-hidden="true" />
</template>
