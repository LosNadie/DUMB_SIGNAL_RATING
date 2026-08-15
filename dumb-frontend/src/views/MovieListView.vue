<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Calendar, Refresh, Star } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { movieApi } from '../api'
import type { MovieItem } from '../types/models'
import { consumeCubeNavigation } from '../composables/useCubeTransition'
import CatalogPageShell from '../components/catalog/CatalogPageShell.vue'
import CircularContentGallery from '../components/catalog/CircularContentGallery.vue'
import {
  getCatalogSourceSignature,
  getCatalogGenres,
  getCatalogYear,
  normalizeMovieCatalogItem,
  type CatalogOpenPayload,
  type CatalogGalleryItem,
} from '../components/catalog/catalogGallery'
import {
  getCatalogSession,
  navigateToCatalogDetail,
  prefetchCatalogDetail,
  updateCatalogSession,
} from '../composables/useCatalogTransition'

const router = useRouter()
const route = useRoute()
const session = getCatalogSession<MovieItem>('movie')
const list = ref<MovieItem[]>(session.data)
const loading = ref(false)
const loadError = ref('')
const introFromCube = ref(false)
const filters = reactive({
  keyword: session.filters.keyword ?? '',
  year: session.filters.year ?? '',
  genre: session.filters.genre ?? '',
  region: session.filters.region ?? '',
})
const sortField = ref<'date' | 'score'>(session.sortField)
const sortOrder = ref<'desc' | 'asc'>(session.sortOrder)
const activeId = ref<number | null>(session.activeId)
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let loadController: AbortController | null = null

const yearOptions = computed(() => Array.from(new Set(
  list.value.map((item) => getCatalogYear(item.releaseDate)).filter(Boolean),
)).sort((a, b) => Number(b) - Number(a)))

const genreOptions = computed(() => Array.from(new Set(
  list.value.flatMap((item) => getCatalogGenres(item.genre)),
)).sort())

const regionOptions = computed(() => Array.from(new Set(
  list.value.map((item) => item.region?.trim()).filter((region): region is string => Boolean(region)),
)).sort())

const filteredList = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const result = list.value.filter((item) => {
    const byKeyword = !keyword
      || item.title.toLowerCase().includes(keyword)
      || (item.director || '').toLowerCase().includes(keyword)
      || (item.actors || '').toLowerCase().includes(keyword)
    const byYear = !filters.year || getCatalogYear(item.releaseDate) === filters.year
    const byGenre = !filters.genre || getCatalogGenres(item.genre).includes(filters.genre)
    const byRegion = !filters.region || item.region?.trim() === filters.region
    return byKeyword && byYear && byGenre && byRegion
  })
  result.sort((a, b) => {
    if (sortField.value === 'score') {
      const first = Number(a.score || 0)
      const second = Number(b.score || 0)
      return sortOrder.value === 'asc' ? first - second : second - first
    }
    const first = a.releaseDate ? new Date(a.releaseDate).getTime() : 0
    const second = b.releaseDate ? new Date(b.releaseDate).getTime() : 0
    return sortOrder.value === 'asc' ? first - second : second - first
  })
  return result
})

const galleryItems = computed(() => filteredList.value.map(normalizeMovieCatalogItem))

function toggleSort(field: 'date' | 'score') {
  if (sortField.value === field) sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.year = ''
  filters.genre = ''
  filters.region = ''
}

function persistSession() {
  updateCatalogSession<MovieItem>('movie', {
    hasData: list.value.length > 0 || session.hasData,
    data: list.value,
    filters: { ...filters },
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    activeId: activeId.value,
  })
}

function openItem(payload: CatalogOpenPayload) {
  persistSession()
  void navigateToCatalogDetail(payload, router)
}

function handleActiveChange(item: CatalogGalleryItem) {
  activeId.value = item.id
  persistSession()
}

async function loadMovies(background = false) {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  if (!background) loading.value = true
  loadError.value = ''
  try {
    const response = await movieApi.list(undefined, { signal: controller.signal })
    if (getCatalogSourceSignature(response.data) !== getCatalogSourceSignature(list.value)) {
      list.value = response.data
    }
    session.hasData = true
    persistSession()
  } catch (error) {
    if (controller.signal.aborted) return
    console.warn('Unable to load movie signals.', error)
    loadError.value = 'UNABLE TO LOAD MOVIE SIGNALS'
  } finally {
    if (loadController === controller) {
      loadController = null
      if (!background) loading.value = false
    }
  }
}

function clearLegacyPageQuery() {
  if (route.query.page === undefined) return
  const query = { ...route.query }
  delete query.page
  void router.replace({ query })
}

onMounted(() => {
  introFromCube.value = consumeCubeNavigation('/movie')
  clearLegacyPageQuery()
  if (session.hasData) refreshTimer = setTimeout(() => void loadMovies(true), 1000)
  else void loadMovies()
})

watch(() => [filters.keyword, filters.year, filters.genre, filters.region], persistSession)
watch([sortField, sortOrder], persistSession)

onBeforeUnmount(() => {
  loadController?.abort()
  if (refreshTimer) clearTimeout(refreshTimer)
  persistSession()
})
</script>

<template>
  <CatalogPageShell
    section="movie"
    title="MOVIE"
    :count="galleryItems.length"
    :loading="loading"
    :error="loadError"
    empty-text="NO MOVIE SIGNALS FOUND"
    :intro-from-cube="introFromCube"
    @back="router.push('/')"
    @retry="loadMovies"
  >
    <template #filters>
      <div class="filter-inner">
        <div class="sort-controls" aria-label="排序方式">
          <button type="button" class="icon-control" :class="{ active: sortField === 'date' }" title="按日期排序" aria-label="按日期排序" @click="toggleSort('date')">
            <el-icon><Calendar /></el-icon>
            <span v-if="sortField === 'date'" class="sort-direction">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
          </button>
          <button type="button" class="icon-control" :class="{ active: sortField === 'score' }" title="按评分排序" aria-label="按评分排序" @click="toggleSort('score')">
            <el-icon><Star /></el-icon>
            <span v-if="sortField === 'score'" class="sort-direction">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
          </button>
        </div>
        <label class="filter-group search-group">
          <span class="filter-label">SEARCH</span>
          <el-input v-model="filters.keyword" clearable aria-label="搜索电影" />
        </label>
        <label class="filter-group">
          <span class="filter-label">GENRE</span>
          <el-select v-model="filters.genre" clearable placeholder="ALL" aria-label="电影类型">
            <el-option v-for="genre in genreOptions" :key="genre" :label="genre" :value="genre" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">YEAR</span>
          <el-select v-model="filters.year" clearable placeholder="ALL" aria-label="电影年份">
            <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">REGION</span>
          <el-select v-model="filters.region" clearable placeholder="ALL" aria-label="电影地区">
            <el-option v-for="region in regionOptions" :key="region" :label="region" :value="region" />
          </el-select>
        </label>
        <div class="filter-actions">
          <button type="button" class="icon-control" aria-label="重置筛选" title="重置筛选" @click="resetFilters">
            <el-icon><Refresh /></el-icon>
          </button>
        </div>
      </div>
    </template>

    <CircularContentGallery
      :items="galleryItems"
      :aspect-ratio="2 / 3"
      :bend="10"
      :border-radius="0.04"
      :scroll-speed="1.8"
      :scroll-ease="0.05"
      :active-id="activeId"
      @active-change="handleActiveChange"
      @prefetch="prefetchCatalogDetail"
      @open="openItem"
    />
  </CatalogPageShell>
</template>
