import 'server-only'

import { unstable_cache } from 'next/cache'

import { prisma } from '@/lib/prisma'

export type FeaturedCategory = 'MUSIC' | 'ANIME' | 'MOVIE'

export interface FeaturedContent {
  id: number
  category: FeaturedCategory
  title: string
  meta: string
  imageUrl: string
  path: string
  timestamp: number
}

export interface HomeData {
  featured: FeaturedContent[]
  counts: { music: number; anime: number; movie: number }
}

/**
 * The three newest items of every category, merged and sorted by the most
 * recent of publish/update time. Mirrors the previous homepage rotation but
 * is computed on the server so the hero is crawlable.
 */
async function loadHomeData(): Promise<HomeData> {
  const [reviews, animes, movies, musicCount, animeCount, movieCount] = await Promise.all([
    prisma.review.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        publishedAt: true,
        updatedAt: true,
        album: { select: { title: true, artist: true, coverImage: true } },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 3,
    }),
    prisma.anime.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        backgroundImage: true,
        studio: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 3,
    }),
    prisma.movie.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        title: true,
        coverImage: true,
        backgroundImage: true,
        director: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 3,
    }),
    prisma.review.count({ where: { status: 'PUBLISHED' } }),
    prisma.anime.count({ where: { status: 'PUBLISHED' } }),
    prisma.movie.count({ where: { status: 'PUBLISHED' } }),
  ])

  const timestamp = (publishedAt: Date | null, updatedAt: Date) =>
    Math.max(publishedAt?.getTime() ?? 0, updatedAt.getTime())

  const candidates: FeaturedContent[] = [
    ...reviews.map((item) => ({
      id: item.id,
      category: 'MUSIC' as const,
      title: item.album.title,
      meta: item.album.artist,
      imageUrl: item.coverImage || item.album.coverImage || '',
      path: `/music/${item.slug}`,
      timestamp: timestamp(item.publishedAt, item.updatedAt),
    })),
    ...animes.map((item) => ({
      id: item.id,
      category: 'ANIME' as const,
      title: item.title,
      meta: item.studio,
      imageUrl: item.coverImage || item.backgroundImage || '',
      path: `/anime/${item.slug}`,
      timestamp: timestamp(item.publishedAt, item.updatedAt),
    })),
    ...movies.map((item) => ({
      id: item.id,
      category: 'MOVIE' as const,
      title: item.title,
      meta: item.director,
      imageUrl: item.coverImage || item.backgroundImage || '',
      path: `/movie/${item.slug}`,
      timestamp: timestamp(item.publishedAt, item.updatedAt),
    })),
  ]

  return {
    featured: candidates.sort((left, right) => right.timestamp - left.timestamp),
    counts: { music: musicCount, anime: animeCount, movie: movieCount },
  }
}

export const getHomeData = unstable_cache(loadHomeData, ['home-data'], {
  revalidate: 300,
  tags: ['home', 'reviews', 'anime', 'movies'],
})
