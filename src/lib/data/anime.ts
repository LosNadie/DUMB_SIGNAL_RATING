import 'server-only'

import { Prisma } from '@prisma/client'
import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { buildPaginated, type Paginated } from '@/lib/pagination'
import type { ListFilters } from '@/lib/search-params'
import { toOrderBy } from '@/lib/search-params'

export const animeCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  backgroundImage: true,
  score: true,
  studio: true,
  releaseDate: true,
  publishedAt: true,
  views: true,
  genres: { select: { name: true, slug: true } },
  author: { select: { username: true } },
} satisfies Prisma.AnimeSelect

export type AnimeCard = Prisma.AnimeGetPayload<{ select: typeof animeCardSelect }>

export const animeDetailSelect = {
  ...animeCardSelect,
  contentHtml: true,
  updatedAt: true,
} satisfies Prisma.AnimeSelect

export type AnimeDetail = Prisma.AnimeGetPayload<{ select: typeof animeDetailSelect }>

function buildWhere(filters: ListFilters): Prisma.AnimeWhereInput {
  const where: Prisma.AnimeWhereInput = { status: 'PUBLISHED' }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { studio: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  if (filters.genre) {
    where.genres = { some: { slug: filters.genre } }
  }
  if (filters.year) {
    const year = Number(filters.year)
    where.releaseDate = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    }
  }

  return where
}

export async function listAnime(filters: ListFilters): Promise<Paginated<AnimeCard>> {
  const where = buildWhere(filters)
  const [items, total] = await prisma.$transaction([
    prisma.anime.findMany({
      where,
      select: animeCardSelect,
      orderBy: toOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.anime.count({ where }),
  ])
  return buildPaginated(items, total, filters.page, filters.pageSize)
}

export const getAnimeBySlug = cache(async (slug: string): Promise<AnimeDetail | null> =>
  prisma.anime.findFirst({ where: { slug, status: 'PUBLISHED' }, select: animeDetailSelect }),
)

export const getAnimeById = cache(async (id: number): Promise<AnimeDetail | null> =>
  prisma.anime.findFirst({ where: { id, status: 'PUBLISHED' }, select: animeDetailSelect }),
)

export async function listAnimeSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.anime.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function listAnimeYears(): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ year: number }[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM release_date)::int AS year
    FROM anime
    WHERE status = 'PUBLISHED' AND release_date IS NOT NULL
    ORDER BY year DESC
  `
  return rows.map((row) => row.year)
}
