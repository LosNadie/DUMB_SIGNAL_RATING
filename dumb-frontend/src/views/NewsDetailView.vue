<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animeApi } from '../api'
import type { AnimeItem } from '../types/models'
import FlowSceneBackdrop from '../components/common/FlowSceneBackdrop.vue'
import PageLoader from '../components/common/PageLoader.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const detail = ref<AnimeItem | null>(null)
const loading = ref(true)
const BACKEND_ORIGIN = 'http://localhost:8080'
const animeId = computed(() => Number(route.params.id))
const hasValidAnimeId = computed(() => Number.isInteger(animeId.value) && animeId.value > 0)

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/500x750/111/eee&text=ANIME'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

const heroBackgroundStyle = (url?: string) => {
  const resolved = resolveCoverUrl(url)
  if (!resolved) return {}
  return {
    backgroundImage: `url('${resolved}')`,
  }
}

function formatReleaseDate(dateStr?: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

async function init() {
  if (!hasValidAnimeId.value) {
    ElMessage.warning('无效的动漫 ID')
    void router.replace('/anime')
    return
  }
  loading.value = true
  try {
    const res = await animeApi.detail(animeId.value)
    detail.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.message || '加载动漫详情失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void init()
})

watch(
  () => route.params.id,
  () => {
    void init()
  },
)
</script>

<template>
  <PageLoader :visible="loading || !detail" />
  <article v-if="detail" class="anime-detail">
    <FlowSceneBackdrop />
    <section class="banner" :style="heroBackgroundStyle(detail.backgroundImage)"></section>

    <section class="poster-row">
      <div class="cover-box">
        <img :src="resolveCoverUrl(detail.coverImage)" :alt="detail.title" class="cover" />
      </div>
      <div class="meta-panel">
        <h1>{{ detail.title }}</h1>
        <p>评分：{{ Number(detail.score || 0).toFixed(1) }}</p>
        <p>制片商：{{ detail.studio || '-' }}</p>
        <p>发行年月：{{ formatReleaseDate(detail.releaseDate) }}</p>
      </div>
    </section>
    <section class="content" v-lazy-imgs v-html="detail.content"></section>
  </article>
</template>

<style scoped>
.anime-detail {
  position: relative;
  display: grid;
  gap: 24px;
}

.anime-detail > :not(.flow-scene-backdrop) {
  position: relative;
  z-index: 2;
}

.banner {
  min-height: 400px;
  border-top: none;
  border-bottom: none;
  border-left: none;
  border-right: none;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
  background-color: transparent;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

.poster-row {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  align-items: end;
  margin-top: -190px;
  padding: 0 16px;
  position: relative;
  z-index: 2;
}

.cover-box {
  border: none;
  overflow: hidden;
  background: transparent;
  box-shadow: none;
}

.cover {
  width: 100%;
  display: block;
  aspect-ratio: 2 / 3;
  object-fit: cover;
}

.meta-panel {
  padding: 16px;
  border: none;
  background: transparent;
  backdrop-filter: none;
}

.meta-panel h1 {
  margin: 0 0 12px;
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: #fff;
}

.meta-panel p {
  margin: 0 0 8px;
  color: var(--dumb-muted);
  font-size: 0.98rem;
}

.content {
  line-height: 1.9;
}

@media (max-width: 900px) {
  .banner { min-height: 260px; }
  .poster-row { grid-template-columns: 1fr; margin-top: -130px; }
  .cover-box { max-width: 280px; }
}
</style>
