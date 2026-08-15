<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { CSSProperties } from 'vue'

function createRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function createStarMap(count: number, seed: number) {
  const random = createRandom(seed)

  return Array.from({ length: count }, () => {
    const x = (random() * 100).toFixed(3)
    const y = (random() * 200).toFixed(3)
    const opacity = (0.42 + random() * 0.58).toFixed(2)
    return `${x}vw ${y}vh rgba(255, 255, 255, ${opacity})`
  }).join(', ')
}

const starStyles = {
  '--stars-small': createStarMap(620, 7301),
  '--stars-medium': createStarMap(190, 2749),
  '--stars-large': createStarMap(90, 9817),
} as CSSProperties

const paused = ref(false)

function syncVisibility() {
  paused.value = document.hidden
}

onMounted(() => {
  syncVisibility()
  document.addEventListener('visibilitychange', syncVisibility)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', syncVisibility)
})
</script>

<template>
  <div
    class="starfield-background"
    :class="{ 'is-paused': paused }"
    :style="starStyles"
    aria-hidden="true"
  >
    <span class="star-layer star-layer--small" />
    <span class="star-layer star-layer--medium" />
    <span class="star-layer star-layer--large" />
  </div>
</template>

<style scoped>
.starfield-background {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
}

.star-layer,
.star-layer::after {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: var(--star-size);
  height: var(--star-size);
  border-radius: 50%;
  background: transparent;
  box-shadow: var(--star-map);
  content: '';
}

.star-layer::after {
  top: 200vh;
}

.star-layer--small {
  --star-size: 1px;
  --star-map: var(--stars-small);
  animation: starfield-drift 50s linear infinite;
}

.star-layer--medium {
  --star-size: 2px;
  --star-map: var(--stars-medium);
  animation: starfield-drift 100s linear infinite;
}

.star-layer--large {
  --star-size: 3px;
  --star-map: var(--stars-large);
  animation: starfield-drift 150s linear infinite;
}

.starfield-background.is-paused .star-layer {
  animation-play-state: paused;
}

@keyframes starfield-drift {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-200vh);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star-layer {
    animation: none;
  }
}
</style>
