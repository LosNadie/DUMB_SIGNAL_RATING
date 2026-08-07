<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { reviewApi } from '../api'
import { ElMessage } from 'element-plus'
import CommentSection from '../components/common/CommentSection.vue'

const route = useRoute()
const router = useRouter()
const detail = ref<any>(null)
const loading = ref(true)
const reviewId = computed(() => Number(route.params.id))
const hasValidReviewId = computed(() => Number.isInteger(reviewId.value) && reviewId.value > 0)
const BACKEND_ORIGIN = 'http://localhost:8080'

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

const hasVideoBg = computed(() => !!parsedContent.value.mvUrl)
const bgImageUrl = computed(() => {
  const bg = parsedContent.value.backgroundImage
  return resolveCoverUrl(bg || detail.value?.coverImage)
})

async function loadDetail() {
  if (!hasValidReviewId.value) return
  const detailRes = await reviewApi.detail(reviewId.value)
  detail.value = detailRes.data
}

async function init() {
  if (!hasValidReviewId.value) {
    ElMessage.warning('无效的乐评 ID')
    void router.replace('/music')
    return
  }
  loading.value = true
  try {
    await loadDetail()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载乐评详情失败')
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
  <div class="music-detail" :class="{ 'is-loading': loading || !detail }">
    <!-- 丝滑加载层 -->
    <Transition name="loader-fade">
      <div v-if="loading || !detail" class="detail-loader">
        <div class="loader-ring">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <p class="loader-text">DUMB</p>
      </div>
    </Transition>
    <!-- 全屏视频/图片背景 -->
    <div class="detail-bg">
      <video
        v-if="hasVideoBg"
        class="bg-video"
        :src="parsedContent.mvUrl"
        autoplay
        muted
        loop
        playsinline
      />
      <div v-else class="bg-image" :style="{ backgroundImage: `url(${bgImageUrl})` }" />
      <div class="bg-overlay" />
    </div>

    <!-- 返回按钮 -->
    <button class="back-btn" @click="router.push({ path: '/music', query: route.query })">←</button>

    <!-- 主内容 -->
    <div class="detail-content">
      <!-- 专辑信息区 -->
      <section class="album-hero">
        <div class="hero-cover">
          <img :src="resolveCoverUrl(detail.coverImage)" :alt="detail.albumTitle" />
        </div>
        <div class="hero-info">
          <h1 class="info-title">{{ parsedTitle.albumTitle }}</h1>
          <p class="info-artist">{{ parsedTitle.artist }}</p>
          <div class="info-score-row">
            <span class="info-stars">★ {{ Number(detail.score || 0).toFixed(1) }}</span>
            <span class="info-sep">·</span>
            <span class="info-year">{{ detail.releaseDate || '' }}</span>
          </div>
        </div>
      </section>

      <!-- 曲目 + 正文 + 评论 -->
      <div class="detail-body">
        <div class="body-main">
          <!-- 乐评正文 -->
          <article class="review-text" v-html="parsedContent.description" />

          <!-- 评论区 -->
          <CommentSection contentType="REVIEW" :contentId="reviewId" />
        </div>

        <!-- 侧边曲目列表 -->
        <aside class="body-sidebar">
          <div class="sidebar-card" v-if="parsedContent.tracks.length > 0">
            <h4>曲目</h4>
            <ol class="track-list">
              <li v-for="(track, idx) in parsedContent.tracks" :key="idx">{{ track }}</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.music-detail {
  position: relative;
  min-height: 100vh;
  color: #ffffff;
}

/* ====== 丝滑加载层 ====== */
.detail-loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  background: #0a0a0a;
  pointer-events: none;
}

.loader-ring {
  position: relative;
  width: 56px;
  height: 56px;
}

.loader-ring span {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: ringSpin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.loader-ring span:nth-child(1) {
  animation-duration: 1.4s;
}

.loader-ring span:nth-child(2) {
  inset: 8px;
  border-top-color: rgba(255, 255, 255, 0.5);
  animation-duration: 1.1s;
  animation-direction: reverse;
}

.loader-ring span:nth-child(3) {
  inset: 16px;
  border-top-color: rgba(255, 255, 255, 0.25);
  animation-duration: 0.8s;
}

@keyframes ringSpin {
  to {
    transform: rotate(360deg);
  }
}

.loader-text {
  margin: 0;
  font-family: 'Cinzel', 'Playfair Display', serif;
  font-size: 0.85rem;
  letter-spacing: 8px;
  color: rgba(255, 255, 255, 0.35);
  animation: textPulse 2s ease-in-out infinite;
}

@keyframes textPulse {
  0%, 100% {
    opacity: 0.35;
  }
  50% {
    opacity: 0.7;
  }
}

/* 丝滑过渡 */
.loader-fade-enter-active,
.loader-fade-leave-active {
  transition: opacity 0.6s ease;
}

.loader-fade-enter-from,
.loader-fade-leave-to {
  opacity: 0;
}

/* ====== 全屏背景 ====== */
.detail-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.bg-video,
.bg-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bg-image {
  background-size: cover;
  background-position: center;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.95) 100%);
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
</style>
