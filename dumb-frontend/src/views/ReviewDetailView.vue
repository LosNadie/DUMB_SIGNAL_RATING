<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import CommentSection from '../components/common/CommentSection.vue'
import { normalizeMusicCatalogItem } from '../components/catalog/catalogGallery'
import {
  catalogTransitionState,
  getRememberedCatalogItem,
  loadCatalogDetail,
  rememberCatalogItem,
} from '../composables/useCatalogTransition'
import { useDetailCoverTransition } from '../composables/useDetailCoverTransition'

const route = useRoute()
const router = useRouter()
const detail = ref<any>(null)
const loading = ref(true)
const loadError = ref('')
const coverBoxRef = ref<HTMLElement | null>(null)
const bodyRevealDelay = ref(20)
const commentRevealDelay = ref(80)
const sidebarRevealDelay = ref(140)
const reviewId = computed(() => Number(route.params.id))
const hasValidReviewId = computed(() => Number.isInteger(reviewId.value) && reviewId.value > 0)
const BACKEND_ORIGIN = 'http://localhost:8080'
const rememberedItem = getRememberedCatalogItem(route.path)
const catalogItem = computed(() => {
  if (detail.value) return normalizeMusicCatalogItem(detail.value)
  return rememberedItem?.id === reviewId.value ? rememberedItem : null
})

const parsedContent = computed(() => {
  if (!detail.value?.content) {
    return { description: '', tracks: [] as string[], mvUrl: '', backgroundImage: '' }
  }
  const lines = String(detail.value.content).split('\n')
  let tracksRaw = ''
  let mvUrl = ''
  let backgroundImage = ''
  const remaining: string[] = []
  for (const line of lines) {
    if (line.startsWith('风格：') || line.startsWith('年份：')) continue
    if (line.startsWith('曲目：')) {
      tracksRaw = line.replace('曲目：', '').trim()
      continue
    }
    if (line.startsWith('MV：') || line.startsWith('mv：')) {
      mvUrl = line.replace(/^[Mm][Vv]：/, '').trim()
      continue
    }
    if (line.startsWith('背景：')) {
      backgroundImage = line.replace('背景：', '').trim()
      continue
    }
    remaining.push(line)
  }
  const tracks = tracksRaw.split('/').map((item) => item.trim()).filter((item) => item.length > 0)
  return { description: remaining.join('\n').trim(), tracks, mvUrl, backgroundImage }
})

// 解析 title "艺人 - 专辑名"
const parsedTitle = computed(() => {
  const raw = detail.value?.title || ''
  if (raw.includes(' - ')) {
    const parts = raw.split(' - ', 2)
    return { artist: parts[0].trim(), albumTitle: parts[1].trim() }
  }
  return { artist: '', albumTitle: raw }
})

function resolveCoverUrl(url?: string) {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

const displayTitle = computed(() => detail.value ? parsedTitle.value.albumTitle : catalogItem.value?.title || '')
const displayArtist = computed(() => detail.value ? parsedTitle.value.artist : catalogItem.value?.meta || '')
const displayScore = computed(() => detail.value
  ? Number(detail.value.score || 0).toFixed(1)
  : catalogItem.value?.score || 'N/A')
const displayCover = computed(() => resolveCoverUrl(detail.value?.coverImage || catalogItem.value?.imageUrl))

const { hideCover, isArriving, getRevealDelay } = useDetailCoverTransition({
  item: catalogItem,
  coverRef: coverBoxRef,
})

async function loadDetail() {
  if (!hasValidReviewId.value) return
  const loaded = await loadCatalogDetail<any>('music', reviewId.value)
  const revealBase = getRevealDelay(
    catalogTransitionState.active && catalogTransitionState.phase !== 'settling' ? 430 : 20,
  )
  bodyRevealDelay.value = revealBase
  commentRevealDelay.value = revealBase + 60
  sidebarRevealDelay.value = revealBase + 120
  detail.value = loaded
  rememberCatalogItem(normalizeMusicCatalogItem(detail.value))
}

async function init() {
  if (!hasValidReviewId.value) {
    ElMessage.warning('无效的乐评 ID')
    void router.replace('/music')
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    await loadDetail()
  } catch (e: any) {
    loadError.value = e?.message || '加载乐评详情失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void init()
})

watch(() => route.params.id, () => {
  void init()
})
</script>

<template>
  <div class="music-detail" :class="{ 'is-arriving': isArriving }">
    <button class="back-btn" @click="router.push({ path: '/music', query: route.query })">←</button>

    <div v-if="catalogItem" class="detail-content">
      <section class="album-hero">
        <div ref="coverBoxRef" class="hero-cover" :class="{ 'cover-hidden': hideCover }">
          <img :src="displayCover" :alt="displayTitle" />
        </div>
        <div class="hero-info">
          <h1 class="info-title detail-reveal detail-reveal-1">{{ displayTitle }}</h1>
          <p class="info-artist detail-reveal detail-reveal-2">{{ displayArtist }}</p>
          <div class="info-score-row detail-reveal detail-reveal-3">
            <span class="info-stars">★ {{ displayScore }}</span>
            <span class="info-sep">·</span>
            <span class="info-year">{{ detail?.releaseDate || '' }}</span>
          </div>
        </div>
      </section>

      <p v-if="loading" class="detail-status loading-status">TUNING SIGNAL</p>
      <div v-else-if="loadError" class="detail-status detail-data-reveal" role="alert">
        <span>{{ loadError }}</span>
        <button type="button" @click="init">RETRY</button>
      </div>
      <div v-else-if="detail" class="detail-body">
        <div class="body-main">
          <article
            class="review-text detail-data-reveal"
            :style="{ animationDelay: `${bodyRevealDelay}ms` }"
            v-lazy-imgs v-html="parsedContent.description"
          />
          <CommentSection
            class="detail-data-reveal"
            :style="{ animationDelay: `${commentRevealDelay}ms` }"
            contentType="REVIEW"
            :contentId="reviewId"
          />
        </div>
        <aside
          class="body-sidebar detail-data-reveal"
          :style="{ animationDelay: `${sidebarRevealDelay}ms` }"
        >
          <div class="sidebar-card" v-if="parsedContent.tracks.length > 0">
            <h4>曲目</h4>
            <ol class="track-list">
              <li v-for="(track, idx) in parsedContent.tracks" :key="idx">{{ track }}</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
    <div v-else class="detail-empty-state">
      <p v-if="loading">TUNING SIGNAL</p>
      <template v-else>
        <p>{{ loadError || 'SIGNAL NOT FOUND' }}</p>
        <button v-if="loadError" type="button" @click="init">RETRY</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.music-detail {
  position: relative;
  min-height: 100vh;
  color: #ffffff;
  background: transparent;
}

/* ====== 返回按钮 ====== */
.back-btn {
  position: fixed;
  top: 48px;
  left: 40px;
  z-index: 10;
  background: transparent;
  border: none;
  color: #fff;
  font-family: 'Inter', sans-serif;
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

/* ====== 主内容 ====== */
.detail-content {
  position: relative;
  z-index: 1;
  padding: 80px 40px 60px;
  max-width: 1100px;
  margin: 0 auto;
}

/* ====== 专辑信息区 ====== */
.album-hero {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-bottom: 60px;
}

.hero-cover {
  flex-shrink: 0;
  width: 280px;
  height: 280px;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
  transition: opacity 180ms ease;
}
.hero-cover.cover-hidden {
  opacity: 0;
}
.hero-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-info {
  padding-bottom: 8px;
}

.info-title {
  margin: 0 0 8px;
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  line-height: 1.1;
}

.info-artist {
  margin: 0 0 16px;
  font-family: 'Inter', sans-serif;
  font-size: 1.1rem;
  font-weight: 300;
  color: rgba(255,255,255,0.7);
}

.info-score-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-stars {
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
}

.info-sep {
  color: rgba(255,255,255,0.3);
}

.info-year {
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.5);
}

/* ====== 下方内容区 ====== */
.detail-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 40px;
}

/* 正文 */
.review-text {
  line-height: 1.9;
  font-size: 1rem;
  color: rgba(255,255,255,0.85);
  margin-bottom: 48px;
  white-space: pre-wrap;
}
.review-text :deep(p) {
  margin: 0 0 1.2em;
}
.review-text :deep(h2),
.review-text :deep(h3) {
  font-family: 'Playfair Display', serif;
  margin: 1.5em 0 0.5em;
}

/* 侧边栏 */
.body-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sidebar-card {
  padding: 20px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  backdrop-filter: blur(8px);
}
.sidebar-card h4 {
  margin: 0 0 14px;
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.track-list {
  margin: 0;
  padding: 0 0 0 18px;
  display: grid;
  gap: 6px;
}
.track-list li {
  font-size: 0.82rem;
  color: rgba(255,255,255,0.65);
  line-height: 1.5;
}

.detail-status,
.detail-empty-state {
  color: rgba(255,255,255,0.5);
  font-size: 0.7rem;
}
.detail-status {
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 100px;
}
.detail-empty-state {
  display: grid;
  min-height: 80vh;
  place-content: center;
  justify-items: center;
  gap: 16px;
}
.detail-status button,
.detail-empty-state button {
  padding: 0 0 3px;
  border: 0;
  border-bottom: 1px solid rgba(255,255,255,0.5);
  background: transparent;
  color: #fff;
  cursor: pointer;
  font: inherit;
}

.detail-reveal,
.detail-data-reveal {
  animation: detailReveal 420ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.detail-reveal-1 { animation-delay: 30ms; }
.detail-reveal-2 { animation-delay: 90ms; }
.detail-reveal-3 { animation-delay: 150ms; }
.is-arriving .detail-reveal-1 { animation-delay: 252ms; }
.is-arriving .detail-reveal-2 { animation-delay: 312ms; }
.is-arriving .detail-reveal-3 { animation-delay: 372ms; }

.loading-status {
  animation: detailStatusReveal 180ms ease 220ms both;
}

@keyframes detailReveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes detailStatusReveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 响应式 */
@media (max-width: 900px) {
  .album-hero {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
    min-height: auto;
    margin-bottom: 40px;
  }
  .hero-cover {
    width: 220px;
    height: 220px;
  }
  .info-title {
    font-size: 2rem;
  }
  .detail-body {
    grid-template-columns: 1fr;
  }
  .body-sidebar {
    order: -1;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .sidebar-card {
    flex: 1;
    min-width: 200px;
  }
}

@media (max-width: 600px) {
  .detail-content {
    padding: 60px 20px 40px;
  }
  .hero-cover {
    width: 180px;
    height: 180px;
  }
  .info-title {
    font-size: 1.6rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-cover { transition: none; }
  .detail-reveal,
  .detail-data-reveal,
  .loading-status { animation: none; }
}
</style>
