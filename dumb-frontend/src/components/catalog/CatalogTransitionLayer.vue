<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  CATALOG_COVER_DURATION,
  CATALOG_COVER_EASING,
  CATALOG_SETTLE_DURATION,
  calculateCoverAnimationFrames,
  catalogTransitionState,
  finishCatalogTransition,
  settleCatalogTransition,
} from '../../composables/useCatalogTransition'

const coverRef = ref<HTMLElement | null>(null)

const coverStyle = computed(() => {
  const rect = catalogTransitionState.fromRect
  if (!rect) return {}
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    backgroundImage: catalogTransitionState.imageReady && catalogTransitionState.item?.imageUrl
      ? `url("${catalogTransitionState.item.imageUrl.replace(/"/g, '\\"')}")`
      : 'none',
  }
})

watch(() => catalogTransitionState.targetVersion, async () => {
  const from = catalogTransitionState.fromRect
  const to = catalogTransitionState.targetRect
  const transitionId = catalogTransitionState.transitionId
  if (!catalogTransitionState.active || !from || !to) return
  await nextTick()
  const cover = coverRef.value
  if (!cover || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishCatalogTransition()
    return
  }

  try {
    const animation = cover.animate(calculateCoverAnimationFrames(from, to), {
      duration: CATALOG_COVER_DURATION,
      easing: CATALOG_COVER_EASING,
      fill: 'forwards',
    })
    await animation.finished
    settleCatalogTransition(transitionId)
    await new Promise<void>((resolve) => window.setTimeout(resolve, CATALOG_SETTLE_DURATION))
  } catch {
    // A replaced route or detached element cancels the animation.
  } finally {
    finishCatalogTransition(transitionId)
  }
})
</script>

<template>
  <div
    v-if="catalogTransitionState.active"
    class="catalog-transition-layer"
    :class="{ settling: catalogTransitionState.phase === 'settling' }"
    aria-hidden="true"
  >
    <div ref="coverRef" class="transition-cover" :style="coverStyle">
      <span v-if="!catalogTransitionState.imageReady">DUMB</span>
    </div>
  </div>
</template>

<style scoped>
.catalog-transition-layer {
  position: fixed;
  inset: 0;
  z-index: 200;
  overflow: hidden;
  pointer-events: none;
}

.transition-cover {
  position: fixed;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  background-color: #080808;
  background-position: center;
  background-size: cover;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.48);
  will-change: left, top, width, height;
  transition: opacity 140ms ease;
}

.settling .transition-cover {
  opacity: 0;
}

.transition-cover span {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: rgba(255, 255, 255, 0.72);
  font-family: 'Cinzel', serif;
  font-size: clamp(0.8rem, 2vw, 1.5rem);
}
</style>
