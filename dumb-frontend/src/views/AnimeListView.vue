<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Calendar, Refresh, Star } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { animeApi } from '../api'
import type { AnimeItem } from '../types/models'
import { consumeCubeNavigation } from '../composables/useCubeTransition'
import CatalogPageShell from '../components/catalog/CatalogPageShell.vue'
import CircularContentGallery from '../components/catalog/CircularContentGallery.vue'
import {
  getCatalogSourceSignature,
  getCatalogGenres,
  getCatalogYear,
  normalizeAnimeCatalogItem,
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
const session = getCatalogSession<AnimeItem>('anime')
const list = ref<AnimeItem[]>(session.data)
const loading = ref(false)
const loadError = ref('')
const introFromCube = ref(false)
const filters = reactive({
  keyword: session.filters.keyword ?? '',
  year: session.filters.year ?? '',
  season: session.filters.season ?? '',
  genre: session.filters.genre ?? '',
})
const sortField = ref<'date' | 'score'>(session.sortField)
const sortOrder = ref<'desc' | 'asc'>(session.sortOrder)
const activeId = ref<number | null>(session.activeId)
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let loadController: AbortController | null = null

const SEASON_OPTIONS = [
  { label: '春', value: 'SPRING' },
  { label: '夏', value: 'SUMMER' },
  { label: '秋', value: 'AUTUMN' },
  { label: '冬', value: 'WINTER' },
] as const

const yearOptions = computed(() => Array.from(new Set(
  list.value.map((item) => getCatalogYear(item.releaseDate)).filter(Boolean),
)).sort((a, b) => Number(b) - Number(a)))

const genreOptions = computed(() => Array.from(new Set(
  list.value.flatMap((item) => getCatalogGenres(item.genre)),
)).sort())

const filteredList = computed(() => {
  const keyword = filters.keyword.trim().toLowerCase()
  const result = list.value.filter((item) => {
    const byKeyword = !keyword
      || item.title.toLowerCase().includes(keyword)
      || (item.studio || '').toLowerCase().includes(keyword)
    const byYear = !filters.year || getCatalogYear(item.releaseDate) === filters.year
    const byGenre = !filters.genre || getCatalogGenres(item.genre).includes(filters.genre)
    let bySeason = !filters.season
    if (filters.season && item.releaseDate) {
      const date = new Date(item.releaseDate)
      if (!Number.isNaN(date.getTime())) {
        const month = date.getMonth() + 1
        const season = month >= 3 && month <= 5
          ? 'SPRING'
          : month >= 6 && month <= 8
            ? 'SUMMER'
            : month >= 9 && month <= 11 ? 'AUTUMN' : 'WINTER'
        bySeason = season === filters.season
      }
    }
    return byKeyword && byYear && byGenre && bySeason
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

const galleryItems = computed(() => filteredList.value.map(normalizeAnimeCatalogItem))

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
  filters.season = ''
  filters.genre = ''
}

function persistSession() {
  updateCatalogSession<AnimeItem>('anime', {
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

async function loadAnime(background = false) {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  if (!background) loading.value = true
  loadError.value = ''
  try {
    const response = await animeApi.list({ signal: controller.signal })
    if (getCatalogSourceSignature(response.data) !== getCatalogSourceSignature(list.value)) {
      list.value = response.data
    }
    session.hasData = true
    persistSession()
  } catch (error) {
    if (controller.signal.aborted) return
    console.warn('Unable to load anime signals.', error)
    loadError.value = 'UNABLE TO LOAD ANIME SIGNALS'
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
  introFromCube.value = consumeCubeNavigation('/anime')
  clearLegacyPageQuery()
  if (session.hasData) refreshTimer = setTimeout(() => void loadAnime(true), 1000)
  else void loadAnime()
})

watch(() => [filters.keyword, filters.year, filters.season, filters.genre], persistSession)
watch([sortField, sortOrder], persistSession)

onBeforeUnmount(() => {
  loadController?.abort()
  if (refreshTimer) clearTimeout(refreshTimer)
  persistSession()
})
</script>

<template>
  <CatalogPageShell
    section="anime"
    title="ANIME"
    :count="galleryItems.length"
    :loading="loading"
    :error="loadError"
    empty-text="NO ANIME SIGNALS FOUND"
    :intro-from-cube="introFromCube"
    @back="router.push('/')"
    @retry="loadAnime"
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
          <el-input v-model="filters.keyword" clearable aria-label="搜索动漫" />
        </label>
        <label class="filter-group">
          <span class="filter-label">GENRE</span>
          <el-select v-model="filters.genre" clearable placeholder="ALL" aria-label="动漫类型">
            <el-option v-for="genre in genreOptions" :key="genre" :label="genre" :value="genre" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">YEAR</span>
          <el-select v-model="filters.year" clearable placeholder="ALL" aria-label="动漫年份">
            <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year" />
          </el-select>
        </label>
        <label class="filter-group">
          <span class="filter-label">SEASON</span>
          <el-select v-model="filters.season" clearable placeholder="ALL" aria-label="动漫季度">
            <el-option v-for="season in SEASON_OPTIONS" :key="season.value" :label="season.label" :value="season.value" />
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
