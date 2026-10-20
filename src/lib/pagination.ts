export const DEFAULT_PAGE_SIZE = 24
export const MAX_PAGE = 500

export interface Pagination {
  page: number
  pageSize: number
  skip: number
  take: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  hasPrevious: boolean
  hasNext: boolean
}

export function parsePage(value: string | string[] | undefined, pageSize = DEFAULT_PAGE_SIZE): Pagination {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '1', 10)
  const page = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), MAX_PAGE) : 1
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}

export function buildPaginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  return {
    items,
    total,
    page,
    pageSize,
    pageCount,
    hasPrevious: page > 1,
    hasNext: page < pageCount,
  }
}
