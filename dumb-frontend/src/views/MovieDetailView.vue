<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { MovieItem } from '../types/models'
import { ElMessage } from 'element-plus'
import CommentSection from '../components/common/CommentSection.vue'
import { normalizeMovieCatalogItem } from '../components/catalog/catalogGallery'
import {
  catalogTransitionState,
  getRememberedCatalogItem,
  loadCatalogDetail,
  rememberCatalogItem,
} from '../composables/useCatalogTransition'
import { useDetailCoverTransition } from '../composables/useDetailCoverTransition'

const route = useRoute()
const router = useRouter()
const detail = ref<MovieItem | null>(null)
const loading = ref(true)
const loadError = ref('')
const coverBoxRef = ref<HTMLElement | null>(null)
const bodyRevealDelay = ref(20)
const commentRevealDelay = ref(80)
const BACKEND_ORIGIN = 'http://localhost:8080'
const movieId = computed(() => Number(route.params.id))
const hasValidMovieId = computed(() => Number.isInteger(movieId.value) && movieId.value > 0)
const rememberedItem = getRememberedCatalogItem(route.path)
const catalogItem = computed(() => {
  if (detail.value) return normalizeMovieCatalogItem(detail.value)
  return rememberedItem?.id === movieId.value ? rememberedItem : null
})
const displayTitle = computed(() => detail.value?.title || catalogItem.value?.title || '')
const displayDirector = computed(() => detail.value?.director || catalogItem.value?.meta || '-')
const displayScore = computed(() => detail.value
  ? Number(detail.value.score || 0).toFixed(1)
  : catalogItem.value?.score || 'N/A')
const displayCover = computed(() => resolveCoverUrl(detail.value?.coverImage || catalogItem.value?.imageUrl))

const { hideCover, isArriving, getRevealDelay } = useDetailCoverTransition({
  item: catalogItem,
  coverRef: coverBoxRef,
})

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/500x750/111/eee&text=MOVIE'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
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
  loadError.value = ''
  try {
    const loaded = await loadCatalogDetail<MovieItem>('movie', movieId.value)
    const revealBase = getRevealDelay(
      catalogTransitionState.active && catalogTransitionState.phase !== 'settling' ? 430 : 20,
    )
    bodyRevealDelay.value = revealBase
    commentRevealDelay.value = revealBase + 60
    detail.value = loaded
    rememberCatalogItem(normalizeMovieCatalogItem(detail.value))
  } catch (e: any) {
    loadError.value = e?.message || '加载电影详情失败'
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
  <article class="movie-detail" :class="{ 'is-arriving': isArriving }">
    <button class="back-btn" @click="router.push({ path: '/movie', query: route.query })">←</button>

    <div v-if="catalogItem" class="detail-content">
      <section class="poster-row">
        <div ref="coverBoxRef" class="cover-box" :class="{ 'cover-hidden': hideCover }">
          <img :src="displayCover" :alt="displayTitle" class="cover" />
        </div>
        <div class="meta-panel">
          <h1 class="detail-reveal detail-reveal-1">{{ displayTitle }}</h1>
          <p class="meta-director detail-reveal detail-reveal-2">{{ displayDirector }}</p>
          <div class="meta-score-row detail-reveal detail-reveal-3">
            <span>★ {{ displayScore }}</span>
            <span class="meta-sep">·</span>
            <span>{{ formatDate(detail?.releaseDate) }}</span>
          </div>
          <div
            v-if="detail && (detail.genre || detail.region)"
            class="meta-tags detail-data-reveal"
            :style="{ animationDelay: `${bodyRevealDelay}ms` }"
          >
            <span v-if="detail.region" class="tag">{{ detail.region }}</span>
            <span v-for="g in (detail.genre || '').split(',').map(s => s.trim()).filter(Boolean)" :key="g" class="tag">{{ g }}</span>
          </div>
        </div>
      </section>
      <p v-if="loading" class="detail-status loading-status">TUNING SIGNAL</p>
      <div v-else-if="loadError" class="detail-status detail-data-reveal" role="alert">
        <span>{{ loadError }}</span>
        <button type="button" @click="init">RETRY</button>
      </div>
      <template v-else-if="detail">
        <section
          class="content detail-data-reveal"
          :style="{ animationDelay: `${bodyRevealDelay}ms` }"
          v-html="detail.content"
        ></section>
        <CommentSection
          class="detail-data-reveal"
          :style="{ animationDelay: `${commentRevealDelay}ms` }"
          contentType="MOVIE"
          :contentId="movieId"
        />
      </template>
    </div>
    <div v-else class="detail-empty-state">
      <p v-if="loading">TUNING SIGNAL</p>
      <template v-else>
        <p>{{ loadError || 'SIGNAL NOT FOUND' }}</p>
        <button v-if="loadError" type="button" @click="init">RETRY</button>
      </template>
    </div>
  </article>
</template>

<style scoped>
.movie-detail {
  position: relative;
  min-height: 100vh;
  color: #fff;
  background: transparent;
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
  transition: opacity 180ms ease;
}
.cover-box.cover-hidden {
  opacity: 0;
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
.meta-director {
  margin: 0 0 16px !important;
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
  margin-bottom: 14px;
}
.meta-sep {
  color: rgba(255,255,255,0.25);
}
.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  padding: 3px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.7);
}

.content {
  line-height: 1.9;
  font-size: 1rem;
  color: rgba(255,255,255,0.85);
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

@media (prefers-reduced-motion: reduce) {
  .cover-box { transition: none; }
  .detail-reveal,
  .detail-data-reveal,
  .loading-status { animation: none; }
}
</style>
