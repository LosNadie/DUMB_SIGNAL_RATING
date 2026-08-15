import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CatalogGalleryItem } from '../components/catalog/catalogGallery'
import {
  catalogTransitionState,
  registerCatalogTransitionTarget,
  rememberCatalogItem,
} from './useCatalogTransition'

interface DetailCoverTransitionOptions {
  item: ComputedRef<CatalogGalleryItem | null>
  coverRef: Ref<HTMLElement | null>
}

export function useDetailCoverTransition(options: DetailCoverTransitionOptions) {
  const isArriving = ref(
    catalogTransitionState.active
      && catalogTransitionState.direction === 'forward'
      && catalogTransitionState.item?.route === window.location.pathname,
  )
  const transitionStartedAt = isArriving.value ? catalogTransitionState.startedAt : 0

  const hideCover = computed(() => (
    catalogTransitionState.active
      && catalogTransitionState.phase !== 'settling'
      && catalogTransitionState.item?.route === options.item.value?.route
  ))

  async function registerTarget() {
    await nextTick()
    const item = options.item.value
    const cover = options.coverRef.value
    if (!item || !cover) return
    rememberCatalogItem(item)
    const bounds = cover.getBoundingClientRect()
    registerCatalogTransitionTarget('detail', item, {
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
    })
  }

  function handleResize() {
    void registerTarget()
  }

  function getRevealDelay(targetOffset: number) {
    if (!transitionStartedAt) return 20
    return Math.max(20, targetOffset - (performance.now() - transitionStartedAt))
  }

  watch([options.item, options.coverRef], () => void registerTarget(), { flush: 'post' })

  onMounted(() => {
    window.addEventListener('resize', handleResize, { passive: true })
    void registerTarget()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize)
  })

  return { hideCover, isArriving, registerTarget, getRevealDelay }
}
