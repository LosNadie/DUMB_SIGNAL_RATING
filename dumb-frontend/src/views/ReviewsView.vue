<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Calendar, Refresh, Star } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { reviewApi } from '../api'
import type { ReviewItem } from '../types/models'
import { consumeCubeNavigation } from '../composables/useCubeTransition'
import CatalogPageShell from '../components/catalog/CatalogPageShell.vue'
import CircularContentGallery from '../components/catalog/CircularContentGallery.vue'
import {
  getCatalogSourceSignature,
  normalizeMusicCatalogItem,
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

const GENRE_OPTIONS = [
  '流行', '摇滚', '嘻哈', '电子', '民谣', 'R&B', '爵士', '古典', '独立流行',
  '另类摇滚', 'K-Pop', 'J-Pop', 'C-Pop', 'House', 'Techno', '放克', '灵魂乐', '电影原声',
]

const session = getCatalogSession<ReviewItem>('music')
const reviews = ref<ReviewItem[]>(session.data)
const loading = ref(false)
const loadError = ref('')
const introFromCube = ref(false)
const filters = reactive({
  keyword: session.filters.keyword ?? '',
  genre: session.filters.genre ?? '',
})
const sortField = ref<'date' | 'score'>(session.sortField)
const sortOrder = ref<'desc' | 'asc'>(session.sortOrder)
const activeId = ref<number | null>(session.activeId)
let searchTimer: ReturnType<typeof setTimeout> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let loadController: AbortController | null = null

const sortedList = computed(() => {
  const result = [...reviews.value]
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

const galleryItems = computed(() => sortedList.value.map(normalizeMusicCatalogItem))

function toggleSort(field: 'date' | 'score') {
  if (sortField.value === field) sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
  else {
    sortField.value = field
    sortOrder.value = 'desc'
  }
}

async function loadReviews(background = false) {
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  if (!background) loading.value = true
  loadError.value = ''
  try {
    const params: Record<string, string> = {}
    if (filters.keyword.trim()) params.keyword = filters.keyword.trim()
    if (filters.genre) params.genre = filters.genre
    const response = await reviewApi.list(
      Object.keys(params).length ? params : undefined,
      { signal: controller.signal },
    )
    if (getCatalogSourceSignature(response.data) !== getCatalogSourceSignature(reviews.value)) {
      reviews.value = response.data
    }
    session.hasData = true
    persistSession()
  } catch (error) {
    if (controller.signal.aborted) return
    console.warn('Unable to load music signals.', error)
    loadError.value = 'UNABLE TO LOAD MUSIC SIGNALS'
  } finally {
    if (loadController === controller) {
      loadController = null
      if (!background) loading.value = false
    }
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.genre = ''
}

function persistSession() {
  updateCatalogSession<ReviewItem>('music', {
    hasData: reviews.value.length > 0 || session.hasData,
    data: reviews.value,
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

function clearLegacyPageQuery() {
  if (route.query.page === undefined) return
  const query = { ...route.query }
  delete query.page
  void router.replace({ query })
}

watch(() => [filters.keyword, filters.genre], () => {
  persistSession()
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void loadReviews(), 300)
})

watch([sortField, sortOrder], persistSession)

onMounted(() => {
  introFromCube.value = consumeCubeNavigation('/music')
  clearLegacyPageQuery()
  if (session.hasData) {
    refreshTimer = setTimeout(() => void loadReviews(true), 1000)
  } else {
    void loadReviews()
  }
})

onBeforeUnmount(() => {
  loadController?.abort()
  if (searchTimer) clearTimeout(searchTimer)
  if (refreshTimer) clearTimeout(refreshTimer)
  persistSession()
})
</script>

<template>
  <CatalogPageShell
    section="music"
    title="MUSIC"
    :count="galleryItems.length"
    :loading="loading"
    :error="loadError"
    empty-text="NO MUSIC SIGNALS FOUND"
    :intro-from-cube="introFromCube"
    @back="router.push('/')"
    @retry="loadReviews"
  >
    <template #filters>
      <div class="filter-inner">
        <div class="sort-controls" aria-label="排序方式">
          <button
            type="button"
            class="icon-control"
            :class="{ active: sortField === 'date' }"
            :aria-label="`按日期${sortField === 'date' && sortOrder === 'asc' ? '升序' : '降序'}排列`"
            title="按日期排序"
            @click="toggleSort('date')"
          >
            <el-icon><Calendar /></el-icon>
            <span v-if="sortField === 'date'" class="sort-direction">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
          </button>
          <button
            type="button"
            class="icon-control"
            :class="{ active: sortField === 'score' }"
            :aria-label="`按评分${sortField === 'score' && sortOrder === 'asc' ? '升序' : '降序'}排列`"
            title="按评分排序"
            @click="toggleSort('score')"
          >
            <el-icon><Star /></el-icon>
            <span v-if="sortField === 'score'" class="sort-direction">{{ sortOrder === 'desc' ? '↓' : '↑' }}</span>
          </button>
        </div>
        <label class="filter-group search-group">
          <span class="filter-label">SEARCH</span>
          <el-input v-model="filters.keyword" clearable aria-label="搜索音乐" />
        </label>
        <label class="filter-group">
          <span class="filter-label">GENRE</span>
          <el-select v-model="filters.genre" clearable placeholder="ALL" aria-label="音乐类型">
            <el-option v-for="genre in GENRE_OPTIONS" :key="genre" :label="genre" :value="genre" />
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
      :aspect-ratio="1"
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
