<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import AppFooter from '../components/common/AppFooter.vue'

const LightRaysBackground = defineAsyncComponent(
  () => import('../components/catalog/LightRaysBackground.vue'),
)

const route = useRoute()
const isAdminPage = computed(() => route.name === 'admin')
const isHomePage = computed(() => route.name === 'home')
const isCatalogPage = computed(() => ['music', 'anime', 'movie'].includes(String(route.name)))
const usesCatalogStage = computed(() => [
  'music',
  'music-detail',
  'anime',
  'anime-detail',
  'movie',
  'movie-detail',
].includes(String(route.name)))
const cachedViews = ['HomeView']
</script>

<template>
  <div class="layout">
    <LightRaysBackground v-if="usesCatalogStage" />
    <main
      class="content"
      :class="{
        'admin-content': isAdminPage,
        'home-content': isHomePage,
        'catalog-content': isCatalogPage,
        'catalog-stage-content': usesCatalogStage,
      }"
    >
      <router-view v-slot="{ Component }">
        <keep-alive :include="cachedViews" :max="2">
          <component :is="Component" :key="String(route.name)" />
        </keep-alive>
      </router-view>
    </main>
    <AppFooter v-if="!isAdminPage && !isHomePage && !isCatalogPage" />
  </div>
</template>

<style scoped>
.layout { min-height: 100vh; background: var(--dumb-bg); color: var(--dumb-text); }
.content { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 18px; }
.content.admin-content { max-width: none; margin: 0; padding: 0; }
.content.home-content { max-width: none; margin: 0; padding: 0; min-height: 100vh; }
.content.catalog-stage-content { width: 100%; max-width: none; margin: 0; padding: 0; }
.content.catalog-content { width: 100%; height: 100svh; max-width: none; margin: 0; padding: 0; overflow: hidden; }

</style>
