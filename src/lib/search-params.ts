/**
 * Parsing and rebuilding of crawlable list URLs.
 *
 * Everything that changes the result set lives in the query string, so a
 * filtered list can be shared, crawled and rendered on the server:
 *
 *   /music?q=radiohead&genre=post-rock&sort=score&order=desc&page=2
 */

import { parsePage, DEFAULT_PAGE_SIZE } from './pagination'

export type SortField = 'date' | 'score'
export type SortOrder = 'asc' | 'desc'

export interface ListFilters {
  q: string
  genre: string
  sort: SortField
  order: SortOrder
  page: number
  pageSize: number
  /** Anime only. */
  year: string
  /** Movies only. */
  region: string
}

export type RawSearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

function pick(value: string, allowed: readonly string[], fallback: string): string {
  return allowed.includes(value) ? value : fallback
}

export function parseListFilters(
  searchParams: RawSearchParams,
  options: { withYear?: boolean; withRegion?: boolean; pageSize?: number } = {},
): ListFilters {
  const pagination = parsePage(searchParams.page, options.pageSize ?? DEFAULT_PAGE_SIZE)
  const year = first(searchParams.year).trim()
  const region = first(searchParams.region).trim()

  return {
    q: first(searchParams.q).trim().slice(0, 120),
    genre: first(searchParams.genre).trim().slice(0, 64),
    sort: pick(first(searchParams.sort), ['date', 'score'], 'date') as SortField,
    order: pick(first(searchParams.order), ['asc', 'desc'], 'desc') as SortOrder,
    page: pagination.page,
    pageSize: pagination.pageSize,
    year: options.withYear && /^\d{4}$/.test(year) ? year : '',
    region: options.withRegion ? region.slice(0, 32) : '',
  }
}

/** True when any filter deviates from the default view. */
export function hasActiveFilters(filters: ListFilters): boolean {
  return Boolean(
    filters.q ||
      filters.genre ||
      filters.year ||
      filters.region ||
      filters.sort !== 'date' ||
      filters.order !== 'desc',
  )
}

/**
 * Build a query string for a list URL. Returns '' when every value is at its
 * default, so canonical links stay clean.
 */
export function buildListQuery(filters: Partial<ListFilters>, base = ''): string {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.year) params.set('year', filters.year)
  if (filters.region) params.set('region', filters.region)
  if (filters.sort && filters.sort !== 'date') params.set('sort', filters.sort)
  if (filters.order && filters.order !== 'desc') params.set('order', filters.order)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))

  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/** Canonical URL for a list page: filters kept, search and pagination dropped. */
export function canonicalListPath(filters: ListFilters, base: string): string {
  return buildListQuery(
    {
      genre: filters.genre,
      year: filters.year,
      region: filters.region,
      sort: filters.sort,
      order: filters.order,
    },
    base,
  )
}

export interface PrismaOrderBy {
  [key: string]: 'asc' | 'desc'
}

/** Map the URL sort state onto a Prisma orderBy clause. */
export function toOrderBy(filters: ListFilters): PrismaOrderBy[] {
  const primary: PrismaOrderBy =
    filters.sort === 'score'
      ? { score: filters.order }
      : { publishedAt: filters.order }
  return [primary, { id: 'desc' }]
}

export const LIST_BASES = {
  music: '/music',
  anime: '/anime',
  movie: '/movie',
} as const
