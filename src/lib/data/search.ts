import 'server-only'

import { prisma } from '@/lib/prisma'

export type SearchType = 'all' | 'music' | 'anime' | 'movie'

export interface SearchResult {
  id: number
  type: Exclude<SearchType, 'all'>
  title: string
  meta: string
  excerpt: string | null
  imageUrl: string | null
  path: string
  score: number
  publishedAt: Date | null
}

export const SEARCH_LIMIT = 20

function normaliseType(value: string | string[] | undefined): SearchType {
  const raw = Array.isArray(value) ? value[0] : value
  return raw === 'music' || raw === 'anime' || raw === 'movie' ? raw : 'all'
}

export function parseSearchQuery(searchParams: Record<string, string | string[] | undefined>) {
  const raw = searchParams.q
  const q = (Array.isArray(raw) ? raw[0] : raw ?? '').trim().slice(0, 120)
  return { q, type: normaliseType(searchParams.type) }
}

export async function searchContent(q: string, type: SearchType): Promise<SearchResult[]> {
  if (!q) return []
  const contains = { contains: q, mode: 'insensitive' as const }

  const [reviews, animes, movies] = await Promise.all([
    type === 'all' || type === 'music'
      ? prisma.review.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [
              { title: contains },
              { album: { title: contains } },
              { album: { artist: contains } },
            ],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            coverImage: true,
            score: true,
            publishedAt: true,
            album: { select: { title: true, artist: true, coverImage: true } },
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: SEARCH_LIMIT,
        })
      : Promise.resolve([]),
    type === 'all' || type === 'anime'
      ? prisma.anime.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [{ title: contains }, { studio: contains }],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            coverImage: true,
            studio: true,
            score: true,
            publishedAt: true,
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: SEARCH_LIMIT,
        })
      : Promise.resolve([]),
    type === 'all' || type === 'movie'
      ? prisma.movie.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [{ title: contains }, { director: contains }],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            coverImage: true,
            director: true,
            score: true,
            publishedAt: true,
          },
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: SEARCH_LIMIT,
        })
      : Promise.resolve([]),
  ])

  const results: SearchResult[] = [
    ...reviews.map((item) => ({
      id: item.id,
      type: 'music' as const,
      title: item.album.title || item.title,
      meta: item.album.artist,
      excerpt: item.excerpt,
      imageUrl: item.coverImage || item.album.coverImage,
      path: `/music/${item.slug}`,
      score: Number(item.score),
      publishedAt: item.publishedAt,
    })),
    ...animes.map((item) => ({
      id: item.id,
      type: 'anime' as const,
      title: item.title,
      meta: item.studio,
      excerpt: item.excerpt,
      imageUrl: item.coverImage,
      path: `/anime/${item.slug}`,
      score: Number(item.score),
      publishedAt: item.publishedAt,
    })),
    ...movies.map((item) => ({
      id: item.id,
      type: 'movie' as const,
      title: item.title,
      meta: item.director,
      excerpt: item.excerpt,
      imageUrl: item.coverImage,
      path: `/movie/${item.slug}`,
      score: Number(item.score),
      publishedAt: item.publishedAt,
    })),
  ]

  return results.sort((left, right) => {
    const leftTime = left.publishedAt?.getTime() ?? 0
    const rightTime = right.publishedAt?.getTime() ?? 0
    return rightTime - leftTime
  })
}
