<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { movieApi } from '../api'
import type { MovieItem } from '../types/models'
import FlowSceneBackdrop from '../components/common/FlowSceneBackdrop.vue'
import PageLoader from '../components/common/PageLoader.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const detail = ref<MovieItem | null>(null)
const loading = ref(true)
const BACKEND_ORIGIN = 'http://localhost:8080'
const movieId = computed(() => Number(route.params.id))
const hasValidMovieId = computed(() => Number.isInteger(movieId.value) && movieId.value > 0)

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/500x750/111/eee&text=MOVIE'
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

function formatDate(dateStr?: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

async function init() {
  if (!hasValidMovieId.value) {
    ElMessage.warning('无效的电影 ID')
    void router.replace('/movie')
    return
  }
  loading.value = true
  try {
    const res = await movieApi.detail(movieId.value)
    detail.value = res.data
  } catch (e: any) {
    ElMessage.error(e?.message || '加载电影详情失败')
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
  <article v-if="detail" class="movie-detail">
    <FlowSceneBackdrop />
    <section class="banner" :style="heroBackgroundStyle(detail.backgroundImage || detail.coverImage)"></section>

    <section class="hero">
      <div class="cover-box">
        <img :src="resolveCoverUrl(detail.coverImage)" :alt="detail.title" class="cover" />
      </div>
      <div class="meta">
        <h1>{{ detail.title }}</h1>
        <p>评分：{{ Number(detail.score || 0).toFixed(1) }}</p>
        <p>导演：{{ detail.director || '-' }}</p>
        <p>主演：{{ detail.actors || '-' }}</p>
        <p>风格：{{ detail.genre || '-' }}</p>
        <p>地区：{{ detail.region || '-' }}</p>
        <p>上映：{{ formatDate(detail.releaseDate) }}</p>
      </div>
    </section>
    <section class="content" v-lazy-imgs v-html="detail.content"></section>
  </article>
</template>

<style scoped>
.movie-detail {
  position: relative;
  display: grid;
  gap: 24px;
}

.movie-detail > :not(.flow-scene-backdrop) {
  position: relative;
  z-index: 2;
}

.banner {
  min-height: 360px;
  border-top: none;
  border-bottom: none;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center center;
  background-color: transparent;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
.hero {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
  margin-top: -120px;
  padding: 0 16px;
  position: relative;
  z-index: 2;
}
.cover-box {
  border: none;
  overflow: hidden;
  box-shadow: none;
  background: transparent;
}
.cover {
  width: 100%;
  display: block;
  aspect-ratio: 2 / 3;
  object-fit: cover;
}
.meta h1 {
  margin: 0 0 12px;
  font-family: 'Playfair Display', serif;
}
.meta p {
  margin: 0 0 8px;
  color: var(--dumb-muted);
}
.meta {
  margin-top: 94px;
}
.content { line-height: 1.9; }
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; margin-top: -60px; }
  .meta { margin-top: 12px; }
}
</style>
