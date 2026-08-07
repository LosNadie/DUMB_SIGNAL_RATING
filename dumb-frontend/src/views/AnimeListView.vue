<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { animeApi } from '../api'
import type { AnimeItem } from '../types/models'
import { consumeCubeNavigation } from '../composables/useCubeTransition'
import AnimeVideoBackground from '../components/common/AnimeVideoBackground.vue'

const router = useRouter()
const route = useRoute()

const list = ref<AnimeItem[]>([])
const introFromCube = ref(false)
const cardsEntered = ref(false)
const loading = ref(false)

const BACKEND_ORIGIN = 'http://localhost:8080'
const PAGE_SIZE = 8

const filters = reactive({
  keyword: '',
  year: '',
  season: '',
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

const SEASON_OPTIONS = [
  { label: '春', value: 'SPRING' },
  { label: '夏', value: 'SUMMER' },
  { label: '秋', value: 'AUTUMN' },
  { label: '冬', value: 'WINTER' },
] as const

function getYear(dateStr?: string) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ''
  return String(date.getFullYear())
}

function getGenres(raw?: string) {
  if (!raw) return []
  return raw.split(',').map((item) => item.trim()).filter((item) => item.length > 0)
}

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/400x400/111/eee&text=ANIME'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

const yearOptions = computed(() => {
  const years = Array.from(new Set(list.value.map((item) => getYear(item.releaseDate)).filter(Boolean)))
  return years.sort((a, b) => Number(b) - Number(a))
})

const genreOptions = computed(() => {
  const genres = new Set<string>()
  list.value.forEach((item) => {
    getGenres(item.genre).forEach((genre) => genres.add(genre))
  })
  return Array.from(genres)
})

const filteredList = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const result = list.value.filter((item) => {
    const byKeyword = !keyword
      || item.title.toLowerCase().includes(keyword)
      || (item.studio || '').toLowerCase().includes(keyword)
    const byYear = !filters.year || getYear(item.releaseDate) === filters.year
    const bySeason = (() => {
      if (!filters.season || !item.releaseDate) return !filters.season
      const date = new Date(item.releaseDate)
      if (Number.isNaN(date.getTime())) return false
      const month = date.getMonth() + 1
      let season = 'WINTER'
      if (month >= 3 && month <= 5) season = 'SPRING'
      else if (month >= 6 && month <= 8) season = 'SUMMER'
      else if (month >= 9 && month <= 11) season = 'AUTUMN'
      return season === filters.season
    })()
    const byGenre = !filters.genre || getGenres(item.genre).includes(filters.genre)
    return byKeyword && byYear && bySeason && byGenre
  })
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

// @ts-expect-error filters are reactive, computed auto-updates
function onSearch() { /* filters are reactive, computed auto-updates */ }

function onReset() {
  filters.keyword = ''
  filters.year = ''
  filters.season = ''
  filters.genre = ''
  page.value = 1
}

function goToDetail(id: number) {
  router.push({ path: `/anime/${id}`, query: { ...route.query } })
}

const paginatedList = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filteredList.value.slice(start, start + PAGE_SIZE)
})

const totalCount = computed(() => filteredList.value.length)

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

function getRecordDelay(index: number) {
  return { '--enter-delay': `${index * 0.08}s` } as Record<string, string>
}

onMounted(async () => {
  introFromCube.value = consumeCubeNavigation('/anime')
  loading.value = true
  try {
    const res = await animeApi.list()
    list.value = res.data
  } finally {
    loading.value = false
    requestAnimationFrame(() => {
      cardsEntered.value = true
    })
  }
})
</script>

<template>
  <AnimeVideoBackground />
  <section class="wax-store" :class="{ 'cube-intro': introFromCube }">
    <!-- ═══════ HEADER ═══════ -->
    <header class="wax-header">
      <button class="back-home" @click="router.push('/')">←</button>
      <h1 class="wax-title">ANIME</h1>
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
          <el-option v-for="genre in genreOptions" :key="genre" :label="genre" :value="genre" />
        </el-select>
      </div>
      <div class="filter-group">
        <span class="filter-label">YEAR:</span>
        <el-select v-model="filters.year" clearable placeholder="ALL">
          <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year" />
        </el-select>
      </div>
      <div class="filter-group">
        <span class="filter-label">SEASON:</span>
        <el-select v-model="filters.season" clearable placeholder="ALL">
          <el-option v-for="season in SEASON_OPTIONS" :key="season.value" :label="season.label" :value="season.value" />
        </el-select>
      </div>
      <div class="filter-actions">
        <button class="wax-btn secondary" @click="onReset">RESET</button>
      </div>
    </section>

    <!-- ═══════ GRID ═══════ -->
    <div class="wax-grid" v-show="!loading">
      <div
        v-for="(item, index) in paginatedList"
        :key="item.id"
        class="poster-card"
        :class="{ entered: cardsEntered }"
        :style="getRecordDelay(index)"
        @click="goToDetail(item.id)"
      >
        <div
          class="poster-cover"
          :style="{ backgroundImage: `url('${resolveCoverUrl(item.coverImage)}')` }"
        >
          <div class="poster-hover">
            <p class="poster-title" :title="item.title">{{ item.title }}</p>
            <p class="poster-score">★ {{ Number(item.score || 0).toFixed(1) }}</p>
            <p class="poster-meta">{{ item.studio || '-' }}</p>
            <p class="poster-meta">{{ item.releaseDate?.split('-')[0] || '-' }}</p>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-if="!loading && filteredList.length === 0" description="暂无动漫" />

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

.wax-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 40px;
  flex-wrap: wrap;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
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

.wax-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

/* ── poster card with hover overlay ── */
.poster-card {
  cursor: pointer;
  opacity: 0;
  transform: translateY(12px);
  border-radius: 8px;
  overflow: hidden;
}

.poster-card.entered {
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

.poster-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  background-size: cover;
  background-position: center;
  background-color: #111;
  transition: transform 0.3s ease;
}

.poster-card:hover .poster-cover {
  transform: scale(1.05);
}

.poster-hover {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  background: rgba(0, 0, 0, 0.82);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.poster-card:hover .poster-hover {
  opacity: 1;
  transform: translateY(0);
}

.poster-title {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 0.94rem;
  font-weight: 700;
  text-align: center;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.poster-score {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  color: #fff;
}

.poster-meta {
  margin: 0;
  font-size: 0.84rem;
  text-align: center;
  color: rgba(230, 238, 255, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

@media (max-width: 1200px) {
  .wax-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .wax-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .wax-store {
    padding: 32px 20px 60px;
  }
}

@media (max-width: 480px) {
  .wax-grid {
    grid-template-columns: 1fr;
    max-width: 320px;
    margin: 0 auto;
  }
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
