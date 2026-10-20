import 'server-only'

import { Prisma } from '@prisma/client'
import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { buildPaginated, type Paginated } from '@/lib/pagination'
import type { ListFilters } from '@/lib/search-params'
import { toOrderBy } from '@/lib/search-params'

/** Card-sized projection — never select contentHtml for lists. */
export const reviewCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  score: true,
  publishedAt: true,
  views: true,
  album: {
    select: {
      id: true,
      title: true,
      artist: true,
      coverImage: true,
      releaseDate: true,
      genres: { select: { name: true, slug: true } },
    },
  },
  author: { select: { username: true } },
} satisfies Prisma.ReviewSelect

export type ReviewCard = Prisma.ReviewGetPayload<{ select: typeof reviewCardSelect }>

export const reviewDetailSelect = {
  ...reviewCardSelect,
  contentHtml: true,
  tracks: true,
  mvUrl: true,
  backgroundImage: true,
  updatedAt: true,
  album: {
    select: {
      id: true,
      title: true,
      artist: true,
      coverImage: true,
      releaseDate: true,
      label: true,
      description: true,
      genres: { select: { name: true, slug: true } },
    },
  },
} satisfies Prisma.ReviewSelect

export type ReviewDetail = Prisma.ReviewGetPayload<{ select: typeof reviewDetailSelect }>

function buildWhere(filters: ListFilters): Prisma.ReviewWhereInput {
  const where: Prisma.ReviewWhereInput = { status: 'PUBLISHED' }

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { album: { title: { contains: filters.q, mode: 'insensitive' } } },
      { album: { artist: { contains: filters.q, mode: 'insensitive' } } },
    ]
  }
  if (filters.genre) {
    where.album = { genres: { some: { slug: filters.genre } } }
  }

  return where
}

export async function listReviews(filters: ListFilters): Promise<Paginated<ReviewCard>> {
  const where = buildWhere(filters)
  const [items, total] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      select: reviewCardSelect,
      orderBy: toOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.review.count({ where }),
  ])

  return buildPaginated(items, total, filters.page, filters.pageSize)
}

/** Cached per request so generateMetadata and the page share one query. */
export const getReviewBySlug = cache(async (slug: string): Promise<ReviewDetail | null> => {
  return prisma.review.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: reviewDetailSelect,
  })
})

export const getReviewById = cache(async (id: number): Promise<ReviewDetail | null> => {
  return prisma.review.findFirst({
    where: { id, status: 'PUBLISHED' },
    select: reviewDetailSelect,
  })
})

export async function listReviewSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  return prisma.review.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function listGenresForType(type: 'music' | 'anime' | 'movie') {
  const rows =
    type === 'music'
      ? await prisma.genre.findMany({
          where: { albums: { some: { reviews: { some: { status: 'PUBLISHED' } } } } },
          select: { name: true, slug: true },
          orderBy: { name: 'asc' },
        })
      : type === 'anime'
        ? await prisma.genre.findMany({
            where: { animes: { some: { status: 'PUBLISHED' } } },
            select: { name: true, slug: true },
            orderBy: { name: 'asc' },
          })
        : await prisma.genre.findMany({
            where: { movies: { some: { status: 'PUBLISHED' } } },
            select: { name: true, slug: true },
            orderBy: { name: 'asc' },
          })
  return rows
}
