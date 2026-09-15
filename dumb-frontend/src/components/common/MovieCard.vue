<script setup lang="ts">
import type { MovieItem } from '../../types/models'

const props = defineProps<{ item: MovieItem }>()

const BACKEND_ORIGIN = 'http://localhost:8080'

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

function getPrimaryGenre(raw?: string) {
  if (!raw) return '-'
  return raw.split(',').map((item) => item.trim()).filter(Boolean)[0] || '-'
}
</script>

<template>
  <article class="movie-card" @click="$router.push(`/movie/${props.item.id}`)">
    <div class="poster-wrap">
      <img :src="resolveCoverUrl(props.item.coverImage)" :alt="props.item.title" class="poster" loading="lazy" decoding="async"/>
      <div class="hover-panel">
        <p class="hover-title" :title="props.item.title">{{ props.item.title }}</p>
        <p class="meta">★ {{ Number(props.item.score || 0).toFixed(1) }}</p>
        <p class="meta" :title="props.item.director || '-'">{{ props.item.director || '-' }}</p>
        <p class="meta">{{ getPrimaryGenre(props.item.genre) }}</p>
        <p class="meta">{{ props.item.region || '-' }}  ·  {{ formatDate(props.item.releaseDate) }}</p>
      </div>
    </div>
  </article>
</template>

<style scoped>
.movie-card {
  cursor: pointer;
}

.poster-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  border: none;
}

.poster {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.hover-panel {
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

.movie-card:hover .poster {
  transform: scale(1.05);
}

.movie-card:hover .hover-panel {
  opacity: 1;
  transform: translateY(0);
}

.hover-title {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.meta {
  margin: 0;
  font-size: 0.82rem;
  text-align: center;
  color: rgba(228, 236, 255, 0.86);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
