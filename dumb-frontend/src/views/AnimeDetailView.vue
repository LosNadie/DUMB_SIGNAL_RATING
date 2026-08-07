<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animeApi } from '../api'
import type { AnimeItem } from '../types/models'
import { ElMessage } from 'element-plus'
import CommentSection from '../components/common/CommentSection.vue'
import PageLoader from '../components/common/PageLoader.vue'

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
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
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
    <!-- 全屏背景 -->
    <div class="detail-bg">
      <div
        class="bg-image"
        :style="{ backgroundImage: `url('${resolveCoverUrl(detail.backgroundImage || detail.coverImage)}')` }"
      />
      <div class="bg-overlay" />
    </div>

    <!-- 返回按钮 -->
    <button class="back-btn" @click="router.push({ path: '/anime', query: route.query })">←</button>

    <!-- 主内容 -->
    <div class="detail-content">
      <section class="poster-row">
        <div class="cover-box">
          <img :src="resolveCoverUrl(detail.coverImage)" :alt="detail.title" class="cover" />
        </div>
        <div class="meta-panel">
          <h1>{{ detail.title }}</h1>
          <p>{{ detail.studio || '-' }}</p>
          <div class="meta-score-row">
            <span>★ {{ Number(detail.score || 0).toFixed(1) }}</span>
            <span class="meta-sep">·</span>
            <span>{{ formatReleaseDate(detail.releaseDate) }}</span>
          </div>
        </div>
      </section>
      <section class="content" v-html="detail.content"></section>
      <CommentSection contentType="ANIME" :contentId="animeId" />
    </div>
  </article>
</template>

<style scoped>
.anime-detail {
  position: relative;
  min-height: 100vh;
  color: #fff;
}

/* ═══ 全屏背景 ═══ */
.detail-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
}
.bg-image {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.92) 100%);
}

/* ═══ 返回按钮 ═══ */
.back-btn {
  position: fixed;
  top: 48px;
  left: 40px;
  z-index: 10;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.4rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s ease;
  line-height: 1;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* ═══ 主内容 ═══ */
.detail-content {
  position: relative;
  z-index: 1;
  padding: 80px 40px 60px;
  max-width: 1000px;
  margin: 0 auto;
}

.poster-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 40px;
  align-items: flex-end;
  margin-bottom: 48px;
  min-height: 50vh;
}

.cover-box {
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
}
.cover {
  width: 100%;
  display: block;
  aspect-ratio: 2 / 3;
  object-fit: cover;
}

.meta-panel h1 {
  margin: 0 0 10px;
  font-family: 'Playfair Display', serif;
  font-size: 2.4rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}
.meta-panel > p {
  margin: 0 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 1.05rem;
  color: rgba(255,255,255,0.6);
}
.meta-score-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  color: #fff;
}
.meta-sep {
  color: rgba(255,255,255,0.25);
}

.content {
  line-height: 1.9;
  font-size: 1rem;
  color: rgba(255,255,255,0.85);
}

@media (max-width: 768px) {
  .poster-row {
    grid-template-columns: 1fr;
    gap: 24px;
    min-height: auto;
  }
  .cover-box { max-width: 220px; }
  .detail-content { padding: 60px 20px 40px; }
  .meta-panel h1 { font-size: 1.8rem; }
}
</style>
