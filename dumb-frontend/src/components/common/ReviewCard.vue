<script setup lang="ts">
import type { ReviewItem } from '../../types/models'

const props = defineProps<{ item: ReviewItem }>()

const BACKEND_ORIGIN = 'http://localhost:8080'

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/600x350/111/eee&text=DUMB'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

function getYear(dateStr?: string) {
  if (!dateStr) return ''
  return new Date(dateStr).getFullYear()
}
</script>

<template>
  <article class="review-card" @click="$router.push(`/music/${item.id}`)">
    <img class="cover" :src="resolveCoverUrl(props.item.coverImage)" alt="cover" loading="lazy" decoding="async"/>
    <div class="hover-panel">
      <p class="meta album-title" :title="props.item.albumTitle">{{ props.item.albumTitle || '-' }}</p>
      <p class="meta year-line">{{ getYear(props.item.releaseDate) || '-' }}</p>
      <div class="meta-row">
        <span class="meta artist-line" :title="props.item.artist">{{ props.item.artist || '-' }}</span>
        <span class="meta-sep">·</span>
        <span class="meta genre-line" :title="props.item.genre">{{ props.item.genre || '-' }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.review-card {
  position: relative;
  height: 100%;
  background: var(--dumb-panel); 
  border: none;
  border-radius: 0; 
  overflow: hidden; 
  cursor: pointer; 
  transition: transform .2s;
}
.review-card:hover { 
  transform: translateY(-4px); 
}

.cover {
  display: block;
  width: 100%; 
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: cover; 
  transition: transform 0.3s;
}
.review-card:hover .cover {
  transform: scale(1.05);
}

.hover-panel {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 18px 16px;
  min-width: 0;
  text-align: center;
  color: rgba(246, 250, 255, 0.95);
  background: rgba(5, 8, 18, 0.82);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.24s ease, transform 0.24s ease;
  pointer-events: none;
}

.review-card:hover .hover-panel {
  opacity: 1;
  transform: translateY(0);
}

.meta {
  margin: 0;
  font-size: 0.84rem;
  font-family: 'Inter', sans-serif;
  letter-spacing: 0.25px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.album-title {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.year-line {
  font-size: 0.76rem;
  color: rgba(200, 214, 255, 0.7);
  letter-spacing: 0.12em;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  overflow: hidden;
}

.artist-line,
.genre-line {
  color: rgba(220, 232, 255, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-sep {
  color: rgba(180, 196, 255, 0.5);
  flex-shrink: 0;
}
</style>
