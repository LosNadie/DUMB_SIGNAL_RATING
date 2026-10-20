import 'server-only'

import { Prisma } from '@prisma/client'
import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { buildPaginated, type Paginated } from '@/lib/pagination'
import type { ListFilters } from '@/lib/search-params'
import { toOrderBy } from '@/lib/search-params'

export const movieCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  backgroundImage: true,
  score: true,
  director: true,
  actors: true,
  region: true,
  releaseDate: true,
  publishedAt: true,
  views: true,
  genres: { select: { name: true, slug: true } },
  author: { select: { username: true } },
} satisfies Prisma.MovieSelect

export type MovieCard = Prisma.MovieGetPayload<{ select: typeof movieCardSelect }>

export const movieDetailSelect = {
  ...movieCardSelect,
  contentHtml: true,
  updatedAt: true,
} satisfies Prisma.MovieSelect

export type MovieDetail = Prisma.MovieGetPayload<{ select: typeof movieDetailSelect }>

function buildWhere(filters: ListFilters): Prisma.MovieWhereInput {
  const where: Prisma.MovieWhereInput = { status: 'PUBLISHED' }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { director: { contains: filters.q, mode: 'insensitive' } },
      { actors: { has: filters.q } },
    ]
  }
  if (filters.genre) {
    where.genres = { some: { slug: filters.genre } }
  }
  if (filters.region) {
    where.region = filters.region
  }

  return where
}

export async function listMovies(filters: ListFilters): Promise<Paginated<MovieCard>> {
  const where = buildWhere(filters)
  const [items, total] = await prisma.$transaction([
    prisma.movie.findMany({
      where,
      select: movieCardSelect,
      orderBy: toOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.movie.count({ where }),
  ])
  return buildPaginated(items, total, filters.page, filters.pageSize)
}

export const getMovieBySlug = cache(async (slug: string): Promise<MovieDetail | null> =>
  prisma.movie.findFirst({ where: { slug, status: 'PUBLISHED' }, select: movieDetailSelect }),
)

export const getMovieById = cache(async (id: number): Promise<MovieDetail | null> =>
  prisma.movie.findFirst({ where: { id, status: 'PUBLISHED' }, select: movieDetailSelect }),
)

export async function listMovieSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return prisma.movie.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function listMovieRegions(): Promise<string[]> {
  const rows = await prisma.movie.findMany({
    where: { status: 'PUBLISHED', region: { not: null } },
    select: { region: true },
    distinct: ['region'],
    orderBy: { region: 'asc' },
  })
  return rows.map((row) => row.region).filter((region): region is string => Boolean(region))
}
