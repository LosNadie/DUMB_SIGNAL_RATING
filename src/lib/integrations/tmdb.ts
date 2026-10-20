import 'server-only'

import { env } from '@/lib/env'

export interface TmdbCandidate {
  id: number
  title: string
  originalTitle: string
  releaseDate: string | null
  overview: string
  posterPath: string | null
}

export interface TmdbMovieContext {
  id: number
  title: string
  originalTitle: string
  overview: string
  posterUrl: string | null
  backdropUrl: string | null
  releaseDate: string | null
  voteAverage: number | null
  director: string | null
  actors: string[]
  genres: string[]
  region: string | null
}

interface TmdbSearchResult {
  results?: {
    id: number
    title?: string
    original_title?: string
    release_date?: string
    overview?: string
    poster_path?: string | null
  }[]
}

interface TmdbMovieDetail {
  id: number
  title?: string
  original_title?: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  vote_average?: number
  production_countries?: { iso_3166_1?: string; name?: string }[]
  genres?: { name?: string }[]
  credits?: {
    crew?: { job?: string; name?: string }[]
    cast?: { name?: string }[]
  }
}

const REGION_MAP: Record<string, string> = {
  US: '美洲',
  CA: '美洲',
  MX: '美洲',
  BR: '美洲',
  AR: '美洲',
  CN: '亚洲',
  HK: '亚洲',
  TW: '亚洲',
  JP: '亚洲',
  KR: '亚洲',
  TH: '亚洲',
  IN: '亚洲',
  GB: '欧洲',
  FR: '欧洲',
  DE: '欧洲',
  IT: '欧洲',
  ES: '欧洲',
  RU: '欧洲',
  SE: '欧洲',
  DK: '欧洲',
  AU: '大洋洲',
  NZ: '大洋洲',
  ZA: '非洲',
  EG: '非洲',
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!env.TMDB_API_KEY) return null

  const url = new URL(`${env.TMDB_BASE_URL.replace(/\/+$/, '')}${path}`)
  url.searchParams.set('api_key', env.TMDB_API_KEY)
  url.searchParams.set('language', 'zh-CN')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return `${env.TMDB_IMAGE_BASE_URL.replace(/\/+$/, '')}${path}`
}

export async function searchMovies(title: string): Promise<TmdbCandidate[]> {
  const data = await tmdbFetch<TmdbSearchResult>('/search/movie', { query: title })
  return (data?.results ?? []).slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title ?? item.original_title ?? '',
    originalTitle: item.original_title ?? '',
    releaseDate: item.release_date ?? null,
    overview: item.overview ?? '',
    posterPath: item.poster_path ?? null,
  }))
}

export async function getMovieDetail(id: number): Promise<TmdbMovieContext | null> {
  const data = await tmdbFetch<TmdbMovieDetail>(`/movie/${id}`, {
    append_to_response: 'credits',
  })
  if (!data) return null

  const country = data.production_countries?.[0]?.iso_3166_1 ?? ''
  const director = data.credits?.crew?.find((member) => member.job === 'Director')?.name ?? null
  const actors = (data.credits?.cast ?? [])
    .slice(0, 8)
    .map((member) => member.name ?? '')
    .filter(Boolean)

  return {
    id: data.id,
    title: data.title ?? data.original_title ?? '',
    originalTitle: data.original_title ?? '',
    overview: data.overview ?? '',
    posterUrl: imageUrl(data.poster_path),
    backdropUrl: imageUrl(data.backdrop_path),
    releaseDate: data.release_date || null,
    voteAverage: typeof data.vote_average === 'number' ? data.vote_average : null,
    director,
    actors,
    genres: (data.genres ?? []).map((genre) => genre.name ?? '').filter(Boolean),
    region: REGION_MAP[country] ?? null,
  }
}
