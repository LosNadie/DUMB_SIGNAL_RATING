<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  preloadCatalogDetailRoute,
  type CatalogRouteSection,
} from '../../router/catalogRouteLoaders'

const props = withDefaults(defineProps<{
  section: CatalogRouteSection
  title: string
  count: number
  loading?: boolean
  error?: string
  emptyText?: string
  introFromCube?: boolean
}>(), {
  loading: false,
  error: '',
  emptyText: 'NO SIGNALS FOUND',
  introFromCube: false,
})

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'retry'): void
}>()

let cancelPreload: (() => void) | null = null

onMounted(() => {
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
    cancelIdleCallback?: (handle: number) => void
  }
  const requestIdle = idleWindow.requestIdleCallback
  if (requestIdle) {
    const handle = requestIdle.call(
      window,
      () => void preloadCatalogDetailRoute(props.section).catch(() => undefined),
      { timeout: 1200 },
    )
    cancelPreload = () => idleWindow.cancelIdleCallback?.(handle)
    return
  }

  const handle = globalThis.setTimeout(
    () => void preloadCatalogDetailRoute(props.section).catch(() => undefined),
    120,
  )
  cancelPreload = () => globalThis.clearTimeout(handle)
})

onBeforeUnmount(() => {
  cancelPreload?.()
  cancelPreload = null
})
</script>

<template>
  <section
    class="catalog-page"
    :class="{ 'cube-intro': introFromCube }"
  >
    <header class="catalog-header">
      <button type="button" class="header-icon" aria-label="返回首页" title="返回首页" @click="emit('back')">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <div class="catalog-heading">
        <h1>{{ title }}</h1>
      </div>
    </header>

    <section class="catalog-filter" aria-label="内容筛选与排序">
      <slot name="filters" />
    </section>

    <div v-if="loading" class="catalog-status" role="status">
      <span class="status-line" />
      <p>TUNING SIGNALS</p>
    </div>
    <div v-else-if="error" class="catalog-status" role="alert">
      <p>{{ error }}</p>
      <button type="button" class="status-action" @click="emit('retry')">RETRY</button>
    </div>
    <div v-else-if="count === 0" class="catalog-status">
      <p>{{ emptyText }}</p>
    </div>
    <slot v-else />
  </section>
</template>

<style scoped>
.catalog-page {
  position: relative;
  z-index: 1;
  display: flex;
  box-sizing: border-box;
  width: 100%;
  height: 100svh;
  min-height: 0;
  max-width: none;
  margin: 0 auto;
  padding: 22px 0 8px;
  flex-direction: column;
  overflow: hidden;
  color: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.catalog-header {
  flex: 0 0 auto;
  width: min(1160px, calc(100% - 36px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 120px;
  align-items: center;
  min-height: 92px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.16);
}

.header-icon {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.68);
  cursor: pointer;
  font-size: 1.1rem;
  transition: color 180ms ease, transform 180ms ease;
}

.header-icon:hover,
.header-icon:focus-visible {
  color: #fff;
  transform: translateX(-2px);
  outline: none;
}

.catalog-heading {
  min-width: 0;
  text-align: center;
}

.catalog-heading h1 {
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0;
}

.catalog-filter {
  flex: 0 0 auto;
  width: min(1160px, calc(100% - 36px));
  margin: 0 auto;
  min-height: 74px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.catalog-filter :deep(.filter-inner) {
  display: flex;
  align-items: flex-end;
  gap: 18px;
  min-width: 0;
}

.catalog-filter :deep(.filter-group) {
  display: grid;
  grid-template-rows: auto 30px;
  gap: 3px;
  min-width: 108px;
}

.catalog-filter :deep(.search-group) {
  flex: 1 1 190px;
  max-width: 230px;
}

.catalog-filter :deep(.filter-label) {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.6rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
}

.catalog-filter :deep(.el-input),
.catalog-filter :deep(.el-select) {
  width: 100%;
}

.catalog-filter :deep(.el-input__wrapper),
.catalog-filter :deep(.el-select__wrapper) {
  min-height: 30px;
  padding: 0 2px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.catalog-filter :deep(.el-input__wrapper:hover),
.catalog-filter :deep(.el-select__wrapper:hover),
.catalog-filter :deep(.el-input__wrapper.is-focus),
.catalog-filter :deep(.el-select__wrapper.is-focused) {
  border-bottom-color: rgba(255, 255, 255, 0.7);
  box-shadow: none;
}

.catalog-filter :deep(.el-input__inner),
.catalog-filter :deep(.el-select__selected-item),
.catalog-filter :deep(.el-select__placeholder) {
  color: rgba(255, 255, 255, 0.82);
  font-family: 'Inter', sans-serif;
  font-size: 0.74rem;
  letter-spacing: 0;
}

.catalog-filter :deep(.sort-controls),
.catalog-filter :deep(.filter-actions) {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
}

.catalog-filter :deep(.filter-actions) {
  margin-left: auto;
}

.catalog-filter :deep(.icon-control) {
  position: relative;
  display: inline-grid;
  width: 34px;
  height: 30px;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 0.95rem;
  transition: color 180ms ease, background-color 180ms ease;
}

.catalog-filter :deep(.icon-control:hover),
.catalog-filter :deep(.icon-control:focus-visible),
.catalog-filter :deep(.icon-control.active) {
  color: #fff;
  background: rgba(255, 255, 255, 0.07);
  outline: none;
}

.catalog-filter :deep(.sort-direction) {
  position: absolute;
  right: 2px;
  bottom: 1px;
  font-size: 0.52rem;
  line-height: 1;
}

.catalog-status {
  display: grid;
  flex: 1 1 auto;
  min-height: 430px;
  place-content: center;
  justify-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.45);
  text-align: center;
}

.catalog-page :deep(.circular-gallery) {
  flex: 1 1 auto;
}

.catalog-status p {
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0;
}

.status-line {
  width: 72px;
  height: 1px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.14);
}

.status-line::after {
  display: block;
  width: 45%;
  height: 100%;
  background: #fff;
  content: '';
  animation: statusScan 1.2s ease-in-out infinite alternate;
}

.status-action {
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
  background: transparent;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.68rem;
}

.cube-intro {
  animation: catalogReveal 700ms ease-out both;
}

@keyframes statusScan {
  from { transform: translateX(-110%); }
  to { transform: translateX(235%); }
}

@keyframes catalogReveal {
  from { opacity: 0.35; transform: scale(1.01); }
  to { opacity: 1; transform: scale(1); }
}

@media (max-width: 760px) {
  .catalog-page {
    padding: 8px 0;
  }

  .catalog-header {
    width: calc(100% - 24px);
    grid-template-columns: 44px minmax(0, 1fr) 62px;
    min-height: 76px;
  }

  .catalog-heading h1 {
    margin: 0;
    font-size: 2rem;
  }

  .catalog-filter {
    width: calc(100% - 24px);
    padding: 14px 0 16px;
  }

  .catalog-filter :deep(.filter-inner) {
    flex-wrap: wrap;
    gap: 12px 14px;
  }

  .catalog-filter :deep(.search-group) {
    flex: 1 1 calc(100% - 90px);
    max-width: none;
  }

  .catalog-filter :deep(.filter-group:not(.search-group)) {
    flex: 1 1 88px;
  }

  .catalog-filter :deep(.filter-actions) {
    margin-left: 0;
  }

  .catalog-status {
    min-height: 360px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cube-intro,
  .status-line::after {
    animation: none;
  }

}
</style>
