<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reviewApi } from '../api'
import type { ReviewItem } from '../types/models'
import { consumeCubeNavigation } from '../composables/useCubeTransition'
import MusicVideoBackground from '../components/common/MusicVideoBackground.vue'

const router = useRouter()
const route = useRoute()

const GENRE_OPTIONS = [
  { label: '流行', value: '流行' },
  { label: '摇滚', value: '摇滚' },
  { label: '嘻哈', value: '嘻哈' },
  { label: '电子', value: '电子' },
  { label: '民谣', value: '民谣' },
  { label: 'R&B', value: 'R&B' },
  { label: '爵士', value: '爵士' },
  { label: '古典', value: '古典' },
  { label: '独立流行', value: '独立流行' },
  { label: '另类摇滚', value: '另类摇滚' },
  { label: 'K-Pop', value: 'K-Pop' },
  { label: 'J-Pop', value: 'J-Pop' },
  { label: 'C-Pop', value: 'C-Pop' },
  { label: 'House', value: 'House' },
  { label: 'Techno', value: 'Techno' },
  { label: '放克', value: '放克' },
  { label: '灵魂乐', value: '灵魂乐' },
  { label: '电影原声', value: '电影原声' },
]

const BACKEND_ORIGIN = 'http://localhost:8080'
const PAGE_SIZE = 6

const reviews = ref<ReviewItem[]>([])
const loading = ref(false)
const introFromCube = ref(false)
const cardsEntered = ref(false)

const filters = reactive({
  keyword: '',
  genre: '',
})

const page = ref(Number(route.query.page) || 1)
const sortField = ref<'date' | 'score'>('date')
const sortOrder = ref<'desc' | 'asc'>('desc')

function toggleSort(field: 'date' | 'score') {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
  page.value = 1
}

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/400x400/111/eee&text=DUMB'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

function getRecordDelay(index: number) {
  return { '--enter-delay': `${index * 0.08}s` } as Record<string, string>
}

async function loadReviews(isInitial = false) {
  loading.value = true
  if (isInitial) cardsEntered.value = false
  try {
    const params: Record<string, string | number> = {}
    if (filters.keyword.trim()) params.keyword = filters.keyword.trim()
    if (filters.genre) params.genre = filters.genre
    const res = await reviewApi.list(Object.keys(params).length > 0 ? params : undefined)
    reviews.value = res.data
  } finally {
    loading.value = false
    if (isInitial) {
      requestAnimationFrame(() => {
        cardsEntered.value = true
      })
    }
  }
}

// @ts-expect-error used in template
function onSearch() {
  page.value = 1
  void loadReviews()
}

function onReset() {
  filters.keyword = ''
  filters.genre = ''
  page.value = 1
  void loadReviews()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(() => [filters.keyword, filters.genre], () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void loadReviews()
  }, 300)
}, { deep: true })

function goToDetail(id: number) {
  router.push({ path: `/music/${id}`, query: { ...route.query } })
}

const sortedList = computed(() => {
  const result = [...reviews.value]
  result.sort((a, b) => {
    if (sortField.value === 'score') {
      const sa = Number(a.score || 0)
      const sb = Number(b.score || 0)
      return sortOrder.value === 'asc' ? sa - sb : sb - sa
    }
    const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
    const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
    return sortOrder.value === 'asc' ? da - db : db - da
  })
  return result
})

const paginatedList = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sortedList.value.slice(start, start + PAGE_SIZE)
})

const totalCount = computed(() => sortedList.value.length)

watch(page, (newPage) => {
  const query = { ...route.query }
  if (newPage > 1) {
    query.page = String(newPage)
  } else {
    delete query.page
  }
  router.replace({ query })
})

watch(() => route.query.page, (val) => {
  const p = Number(val)
  page.value = p > 0 ? p : 1
})

onMounted(() => {
  introFromCube.value = consumeCubeNavigation('/music')
  void loadReviews(true)
})
</script>

<template>
  <MusicVideoBackground />
  <section class="wax-store" :class="{ 'cube-intro': introFromCube }">
    <!-- ═══════ HEADER ═══════ -->
    <header class="wax-header">
      <button class="back-home" @click="router.push('/')">←</button>
      <h1 class="wax-title">MUSIC</h1>
      <span></span>
    </header>

    <!-- ═══════ FILTER ═══════ -->
    <section class="wax-filter">
      <div class="sort-bar">
        <button
          type="button"
          class="sort-btn"
          :class="{ active: sortField === 'date' }"
          @click="toggleSort('date')"
        >
          {{ sortField === 'date' ? (sortOrder === 'desc' ? '⧖↓' : '⧖↑') : '⧖' }}
        </button>
        <button
          type="button"
          class="sort-btn"
          :class="{ active: sortField === 'score' }"
          @click="toggleSort('score')"
        >
          {{ sortField === 'score' ? (sortOrder === 'desc' ? '★↓' : '★↑') : '★' }}
        </button>
      </div>
      <div class="filter-group">
        <span class="filter-label">SEARCH:</span>
        <el-input v-model="filters.keyword" placeholder="" clearable />
      </div>
      <div class="filter-group">
        <span class="filter-label">GENRE:</span>
        <el-select v-model="filters.genre" clearable placeholder="ALL">
          <el-option v-for="g in GENRE_OPTIONS" :key="g.value" :label="g.label" :value="g.value" />
        </el-select>
      </div>
      <div class="filter-actions">
        <button class="wax-btn secondary" @click="onReset">RESET</button>
      </div>
    </section>

    <!-- ═══════ GRID ═══════ -->
    <div class="wax-grid" v-show="!loading">
      <div
        v-for="(record, index) in paginatedList"
        :key="record.id"
        class="wax-card"
        :class="{ entered: cardsEntered }"
        :style="getRecordDelay(index)"
        @click="goToDetail(record.id)"
      >
        <!-- 封面图 -->
        <div
          class="card-cover"
          :style="{ backgroundImage: `url('${resolveCoverUrl(record.coverImage)}')` }"
        >
          <span class="cover-score">{{ record.score }}</span>
        </div>

        <!-- 信息区 -->
        <div class="card-info">
          <div class="info-meta">
            {{ record.releaseDate?.split('-')[0] || 'N/A' }}
          </div>
          <h3 class="info-title">{{ record.albumTitle }}</h3>
          <p class="info-desc">{{ record.artist }}</p>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && reviews.length === 0" description="暂无专辑" />

    <div v-if="totalCount > PAGE_SIZE" class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        :page-size="PAGE_SIZE"
        :total="totalCount"
        layout="prev, pager, next"
        background
      />
    </div>
  </section>
</template>

<style scoped>
/* ═══════════════════════════════════════════════
   WAX CARD STYLE — Large cards with spacing
   ═══════════════════════════════════════════════ */

.wax-store {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  background: transparent;
  color: #ffffff;
  font-family: 'Inter', -apple-system, sans-serif;
  padding: 48px 40px 80px;
  max-width: 1400px;
  margin: 0 auto;
}

/* ── HEADER ── */
.wax-header {
  margin-bottom: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-home {
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

.back-home:hover {
  background: rgba(255, 255, 255, 0.1);
}

.wax-title {
  font-family: 'Inter', sans-serif;
  font-size: 2.2rem;
  font-weight: 700;
  margin: 0;
  color: #fff;
  letter-spacing: -0.5px;
  text-align: center;
  flex: 1;
}

/* ── FILTER ── */
.wax-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 1px solid #1a1a1a;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 0.7rem;
  color: #fff;
  letter-spacing: 2px;
  font-weight: 500;
}

.wax-filter :deep(.el-input__wrapper) {
  background: transparent;
  box-shadow: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0;
  padding: 0 0 4px 0;
}

.wax-filter :deep(.el-input__wrapper:hover) {
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

.wax-filter :deep(.el-input__wrapper.is-focus) {
  border-bottom-color: #fff;
}

.wax-filter :deep(.el-input__inner) {
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
}

.wax-filter :deep(.el-input__inner::placeholder) {
  color: #444;
}

.wax-filter :deep(.el-select .el-input__wrapper) {
  background: transparent;
  box-shadow: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0;
  padding: 0 0 4px 0;
}

.wax-filter :deep(.el-select .el-input__wrapper.is-focus) {
  border-bottom-color: #fff;
}

.wax-filter :deep(.el-select .el-input__inner) {
  color: #fff;
  font-size: 0.85rem;
}

.filter-actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.wax-btn {
  background: #fff;
  color: #000;
  border: none;
  padding: 7px 18px;
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.wax-btn:hover {
  background: #ccc;
}

.wax-btn.secondary {
  background: transparent;
  color: #666;
  border: 1px solid #333;
}

.wax-btn.secondary:hover {
  border-color: #555;
  color: #fff;
}

/* ═══════════════════════════════════════════════
   GRID — 3-column large cards
   ═══════════════════════════════════════════════ */
.wax-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

/* ── Card ── */
.wax-card {
  background: #0a0a0a;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  opacity: 0;
  transform: translateY(12px);
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease;
  border: 1px solid #151515;
}

.wax-card.entered {
  animation: cardAppear 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--enter-delay, 0s);
}

@keyframes cardAppear {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.wax-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.12);
}

/* 封面图 */
.card-cover {
  position: relative;
  aspect-ratio: 1;
  background-size: cover;
  background-position: center;
  background-color: #111;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), filter 0.4s ease;
}

.wax-card:hover .card-cover {
  transform: scale(1.08);
  filter: brightness(1.08) contrast(1.05);
}

.cover-tag {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.7);
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.cover-score {
  position: absolute;
  top: 14px;
  right: 14px;
  background: #fff;
  color: #000;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease;
}

.wax-card:hover .cover-score {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 信息区 */
.card-info {
  padding: 18px 20px 22px;
  transition: background 0.3s ease;
}

.wax-card:hover .card-info {
  background: #101010;
}

.info-meta {
  font-size: 0.65rem;
  color: #555;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 10px;
  transition: color 0.3s ease;
}

.wax-card:hover .info-meta {
  color: #777;
}

.info-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  line-height: 1.3;
  letter-spacing: -0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.3s ease;
}

.wax-card:hover .info-title {
  color: #fff;
}

.info-desc {
  font-size: 0.82rem;
  color: #666;
  margin: 0;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  transition: color 0.3s ease;
}

.wax-card:hover .info-desc {
  color: #888;
}

.sort-bar {
  display: flex;
  gap: 8px;
}
.filter-actions {
  margin-left: auto;
}
.sort-btn {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.45);
  padding: 6px 14px;
  border-radius: 20px;
  font-family: 'Inter', sans-serif;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1;
  min-width: 42px;
}
.sort-btn:hover {
  border-color: rgba(255,255,255,0.35);
  color: rgba(255,255,255,0.75);
}
.sort-btn.active {
  background: transparent;
  border-color: rgba(255,255,255,0.35);
  color: #ffffff;
  font-weight: 500;
}

.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 48px;
}

/* ═══════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════ */
@media (max-width: 1024px) {
  .wax-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .wax-store {
    padding: 32px 24px 60px;
  }
}

@media (max-width: 640px) {
  .wax-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .wax-title {
    font-size: 1.8rem;
  }

  .wax-filter {
    gap: 14px;
  }

  .filter-actions {
    width: 100%;
    margin-left: 0;
  }
}

/* ── cube transition ── */
.cube-intro .wax-store {
  animation: cubePageReveal 0.9s ease-out both;
}

@keyframes cubePageReveal {
  0% {
    transform: scale(1.02);
    opacity: 0.3;
    filter: blur(2px);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    filter: blur(0);
  }
}
</style>
