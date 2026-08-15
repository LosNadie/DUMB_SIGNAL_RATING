import type { AnimeItem, MovieItem, ReviewItem } from '../../types/models'

export type CatalogCategory = 'MUSIC' | 'ANIME' | 'MOVIE'

export interface CatalogGalleryItem {
  id: number
  imageUrl: string
  title: string
  eyebrow: string
  metaLabel: 'ARTIST' | 'STUDIO' | 'DIRECTOR'
  meta: string
  score: string
  route: string
}

export interface CatalogCoverRect {
  left: number
  top: number
  width: number
  height: number
}

export interface CatalogOpenPayload {
  item: CatalogGalleryItem
  rect: CatalogCoverRect
}

interface CatalogSourceItem {
  id: number
  title?: string
  albumTitle?: string
  artist?: string
  studio?: string
  director?: string
  coverImage?: string
  backgroundImage?: string
  score?: number
  genre?: string
  region?: string
  releaseDate?: string
  publishTime?: string
  updateTime?: string
}

const BACKEND_ORIGIN = 'http://localhost:8080'

export function getCatalogSourceSignature(items: readonly CatalogSourceItem[]) {
  return items.map((item) => [
    item.id,
    item.title,
    item.albumTitle,
    item.artist,
    item.studio,
    item.director,
    item.coverImage,
    item.score,
    item.genre,
    item.region,
    item.releaseDate,
  ].join('\u001f')).join('\u001e')
}

export function getCatalogYear(dateValue?: string) {
  if (!dateValue) return ''
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return ''
  return String(date.getFullYear())
}

export function getCatalogGenres(raw?: string) {
  if (!raw) return []
  return raw.split(',').map((item) => item.trim()).filter(Boolean)
}

export function resolveCatalogImage(url?: string, backendOrigin = BACKEND_ORIGIN) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/uploads/') || url.startsWith('/mock-covers/')) return url
  if (url.startsWith('/')) return `${backendOrigin}${url}`
  return url
}

function formatScore(score: number) {
  const value = Number(score)
  return Number.isFinite(value) ? value.toFixed(1) : 'N/A'
}

function buildEyebrow(category: CatalogCategory, releaseDate?: string) {
  return `${category} / ${getCatalogYear(releaseDate) || 'ARCHIVE'}`
}

export function normalizeMusicCatalogItem(item: ReviewItem): CatalogGalleryItem {
  return {
    id: item.id,
    imageUrl: resolveCatalogImage(item.coverImage),
    title: item.albumTitle || item.title || 'UNTITLED SIGNAL',
    eyebrow: buildEyebrow('MUSIC', item.releaseDate),
    metaLabel: 'ARTIST',
    meta: item.artist || 'UNKNOWN ARTIST',
    score: formatScore(item.score),
    route: `/music/${item.id}`,
  }
}

export function normalizeAnimeCatalogItem(item: AnimeItem): CatalogGalleryItem {
  return {
    id: item.id,
    imageUrl: resolveCatalogImage(item.coverImage),
    title: item.title || 'UNTITLED SIGNAL',
    eyebrow: buildEyebrow('ANIME', item.releaseDate),
    metaLabel: 'STUDIO',
    meta: item.studio || 'UNKNOWN STUDIO',
    score: formatScore(item.score),
    route: `/anime/${item.id}`,
  }
}

export function normalizeMovieCatalogItem(item: MovieItem): CatalogGalleryItem {
  return {
    id: item.id,
    imageUrl: resolveCatalogImage(item.coverImage),
    title: item.title || 'UNTITLED SIGNAL',
    eyebrow: buildEyebrow('MOVIE', item.releaseDate),
    metaLabel: 'DIRECTOR',
    meta: item.director || 'UNKNOWN DIRECTOR',
    score: formatScore(item.score),
    route: `/movie/${item.id}`,
  }
}
