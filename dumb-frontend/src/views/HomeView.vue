<script setup lang="ts">
import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { animeApi, movieApi, reviewApi } from '../api'
import { useAuthStore } from '../stores/auth'
import CineformHomeStage from '../components/home/CineformHomeStage.vue'
import LoginModal from '../components/home/LoginModal.vue'
import SplashScreen from '../components/home/SplashScreen.vue'
import UserFabMenu from '../components/home/UserFabMenu.vue'
import {
  selectFeaturedContents,
  type FeaturedContent,
} from '../components/home/featuredContent'

const router = useRouter()
void useAuthStore()

const featuredContent = ref<FeaturedContent | null>(null)
const featuredContents = ref<FeaturedContent[]>([])
const featuredIndex = ref(0)
const stageMounted = ref(false)
const stageKey = ref(0)
const loadingVisible = ref(true)
const loadingProgress = ref(0)
const loadingPhase = ref('CONNECTING TO ARCHIVE')
const loadingError = ref('')
const loginModalVisible = ref(false)
const initialLoadComplete = ref(false)

let requestToken = 0
let revealTimer: number | null = null
let coverRotationTimer: number | null = null
let homeActive = true

const COVER_ROTATION_INTERVAL_MS = 4000

function featuredContentKey(content: FeaturedContent | null) {
  return content
    ? `${content.category}:${content.id}:${content.timestamp}:${content.imageUrl}`
    : 'empty'
}

function stopCoverRotation() {
  if (coverRotationTimer === null) return
  window.clearInterval(coverRotationTimer)
  coverRotationTimer = null
}

function advanceCover() {
  const contents = featuredContents.value
  if (contents.length <= 1) return
  featuredIndex.value = (featuredIndex.value + 1) % contents.length
  featuredContent.value = contents[featuredIndex.value] || null
}

function startCoverRotation() {
  stopCoverRotation()
  if (!homeActive || document.hidden || !initialLoadComplete.value || featuredContents.value.length <= 1) return
  coverRotationTimer = window.setInterval(advanceCover, COVER_ROTATION_INTERVAL_MS)
}

function handleVisibilityChange() {
  if (document.hidden) stopCoverRotation()
  else startCoverRotation()
}

async function fetchFeaturedContent() {
  const [reviewRes, animeRes, movieRes] = await Promise.all([
    reviewApi.list(),
    animeApi.list(),
    movieApi.list(),
  ])
  return selectFeaturedContents(reviewRes.data, animeRes.data, movieRes.data)
}

async function initializeHome() {
  const token = ++requestToken
  if (revealTimer !== null) {
    window.clearTimeout(revealTimer)
    revealTimer = null
  }
  loadingVisible.value = true
  loadingProgress.value = 3
  loadingPhase.value = 'CONNECTING TO ARCHIVE'
  loadingError.value = ''
  initialLoadComplete.value = false
  stageMounted.value = false
  stopCoverRotation()

  try {
    const contents = await fetchFeaturedContent()
    if (token !== requestToken) return
    featuredContents.value = contents
    featuredIndex.value = 0
    featuredContent.value = contents[0] || null
    loadingProgress.value = 15
    loadingPhase.value = 'PREPARING LATEST SIGNAL'
    stageKey.value += 1
    await nextTick()
    stageMounted.value = true
  } catch (error) {
    if (token !== requestToken) return
    const message = error instanceof Error ? error.message : 'Unknown data error'
    loadingError.value = `Unable to load the latest content: ${message}`
  }
}

async function refreshLatestContent() {
  try {
    const contents = await fetchFeaturedContent()
    const currentKey = featuredContentKey(featuredContent.value)
    const currentIndex = contents.findIndex((content) => featuredContentKey(content) === currentKey)
    featuredContents.value = contents
    featuredIndex.value = currentIndex >= 0 ? currentIndex : 0
    featuredContent.value = contents[featuredIndex.value] || null
    startCoverRotation()
  } catch (error) {
    console.warn('Unable to refresh the latest homepage content.', error)
  }
}

function handleStageProgress(progress: number, phase: string) {
  loadingProgress.value = Math.max(loadingProgress.value, 15 + progress * 0.85)
  loadingPhase.value = phase
}

function handleStageReady() {
  loadingProgress.value = 100
  loadingPhase.value = 'SIGNAL READY'
  initialLoadComplete.value = true
  startCoverRotation()
  revealTimer = window.setTimeout(() => {
    loadingVisible.value = false
    revealTimer = null
  }, 380)
}

function handleStageError(message: string) {
  loadingVisible.value = true
  loadingError.value = message
}

function retryLoading() {
  void initializeHome()
}

function openLatest(route: string) {
  void router.push(route)
}

function openLogin() {
  loginModalVisible.value = true
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void initializeHome()
})

onActivated(() => {
  homeActive = true
  if (initialLoadComplete.value) void refreshLatestContent()
})

onDeactivated(() => {
  homeActive = false
  stopCoverRotation()
})

onBeforeUnmount(() => {
  requestToken += 1
  stopCoverRotation()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (revealTimer !== null) window.clearTimeout(revealTimer)
})
</script>

<template>
  <div class="home-root">
    <SplashScreen
      :visible="loadingVisible"
      :progress="loadingProgress"
      :phase="loadingPhase"
      :error="loadingError"
      @retry="retryLoading"
    />

    <CineformHomeStage
      v-if="stageMounted"
      :key="stageKey"
      :content="featuredContent"
      @progress="handleStageProgress"
      @ready="handleStageReady"
      @error="handleStageError"
      @open="openLatest"
    />

    <section class="signal-home">
      <div class="grain-overlay" />

      <header class="signal-header">
        <h1 class="signal-logo">DUMB</h1>
        <nav class="signal-nav" aria-label="Primary navigation">
          <router-link to="/music" class="nav-link">MUSIC</router-link>
          <span class="nav-divider">/</span>
          <router-link to="/anime" class="nav-link">ANIME</router-link>
          <span class="nav-divider">/</span>
          <router-link to="/movie" class="nav-link">MOVIE</router-link>
        </nav>
      </header>

      <UserFabMenu @open-login="openLogin" />
      <LoginModal v-model:visible="loginModalVisible" />
    </section>
  </div>
</template>

<style scoped>
.home-root {
  display: contents;
}

.signal-home {
  position: fixed;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  font-family: 'Inter', -apple-system, sans-serif;
}

.signal-home :deep(a),
.signal-home :deep(button),
.signal-home :deep(input) {
  pointer-events: auto;
}

.grain-overlay {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.026;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.signal-header {
  position: absolute;
  z-index: 4;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 32px;
  text-align: center;
}

.signal-logo {
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.7rem;
  color: #fff;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.72);
}

.signal-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
}

.nav-link {
  padding: 6px 16px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.18rem;
  text-decoration: none;
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.9);
  transition: color 220ms ease;
}

.nav-link:hover,
.nav-link:focus-visible {
  color: #fff;
  outline: none;
}

.nav-divider {
  color: rgba(255, 255, 255, 0.2);
  font-size: 0.7rem;
  user-select: none;
}

@media (max-width: 768px) {
  .signal-header {
    align-items: flex-start;
    padding: 20px;
    text-align: left;
  }

  .signal-logo {
    font-size: 2rem;
    letter-spacing: 0.45rem;
  }

  .signal-nav {
    margin-top: 12px;
  }

  .nav-link {
    padding: 6px 8px;
    font-size: 0.62rem;
    letter-spacing: 0.12rem;
  }
}
</style>
