<script setup lang="ts">
import type { AnimeItem } from '../../types/models'

const props = defineProps<{ item: AnimeItem }>()

const BACKEND_ORIGIN = 'http://localhost:8080'

function resolveCoverUrl(url?: string) {
  if (!url) return 'https://dummyimage.com/500x750/111/eee&text=ANIME'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${BACKEND_ORIGIN}${url}`
  return url
}

function formatReleaseDate(dateStr?: string) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
</script>

<template>
  <article class="anime-card" @click="$router.push(`/anime/${props.item.id}`)">
    <div class="poster-wrap">
      <img :src="resolveCoverUrl(props.item.coverImage)" :alt="props.item.title" class="poster" loading="lazy" decoding="async"/>
      <div class="hover-panel">
        <p class="title" :title="props.item.title">{{ props.item.title }}</p>
        <p class="score">★ {{ Number(props.item.score || 0).toFixed(1) }}</p>
        <p class="meta" :title="props.item.studio || '-'">{{ props.item.studio || '-' }}</p>
        <p class="meta">{{ formatReleaseDate(props.item.releaseDate) }}</p>
      </div>
    </div>
  </article>
</template>

<style scoped>
.anime-card {
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

.anime-card:hover .poster {
  transform: scale(1.05);
}

.anime-card:hover .hover-panel {
  opacity: 1;
  transform: translateY(0);
}

.score {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  color: #ffffff;
}

.meta {
  margin: 0;
  font-size: 0.84rem;
  text-align: center;
  color: rgba(230, 238, 255, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.title {
  margin: 0;
  font-family: 'Playfair Display', serif;
  font-size: 0.94rem;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
</style>
