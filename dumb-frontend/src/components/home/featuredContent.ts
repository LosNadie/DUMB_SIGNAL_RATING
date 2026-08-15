import type { AnimeItem, MovieItem, ReviewItem } from '../../types/models'

export type FeaturedCategory = 'MUSIC' | 'ANIME' | 'MOVIE'

export interface FeaturedContent {
  id: number
  category: FeaturedCategory
  title: string
  meta: string
  imageUrl: string
  route: string
  timestamp: number
}

function toTimestamp(value?: string) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function latestTimestamp(publishTime?: string, updateTime?: string) {
  return Math.max(toTimestamp(publishTime), toTimestamp(updateTime))
}

export function resolveFeaturedImage(url?: string) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url
  return `/${url.replace(/^\.\//, '')}`
}

export function extractReviewBackground(content?: string) {
  if (!content) return ''
  const match = content.match(/背景：([^<\r\n]+)/)
  return match?.[1]?.trim() || ''
}

export function selectLatestFeaturedContent(
  reviews: ReviewItem[],
  animes: AnimeItem[],
  movies: MovieItem[],
): FeaturedContent | null {
  const candidates: FeaturedContent[] = [
    ...reviews.map((item) => ({
      id: item.id,
      category: 'MUSIC' as const,
      title: item.albumTitle || item.title,
      meta: item.artist || item.authorName || '-',
      imageUrl: resolveFeaturedImage(item.coverImage || extractReviewBackground(item.content)),
      route: `/music/${item.id}`,
      timestamp: latestTimestamp(item.publishTime, item.updateTime),
    })),
    ...animes.map((item) => ({
      id: item.id,
      category: 'ANIME' as const,
      title: item.title,
      meta: item.studio || '-',
      imageUrl: resolveFeaturedImage(item.coverImage || item.backgroundImage),
      route: `/anime/${item.id}`,
      timestamp: latestTimestamp(item.publishTime, item.updateTime),
    })),
    ...movies.map((item) => ({
      id: item.id,
      category: 'MOVIE' as const,
      title: item.title,
      meta: item.director || '-',
      imageUrl: resolveFeaturedImage(item.coverImage || item.backgroundImage),
      route: `/movie/${item.id}`,
      timestamp: latestTimestamp(item.publishTime, item.updateTime),
    })),
  ]

  return candidates.reduce<FeaturedContent | null>((latest, candidate) => {
    if (!latest || candidate.timestamp > latest.timestamp) return candidate
    return latest
  }, null)
}
