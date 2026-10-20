import Link from 'next/link'

import { buildListQuery, type ListFilters } from '@/lib/search-params'

export function CatalogPagination({
  basePath,
  filters,
  page,
  pageCount,
}: {
  basePath: string
  filters: ListFilters
  page: number
  pageCount: number
}) {
  if (pageCount <= 1) return null

  const href = (target: number) => buildListQuery({ ...filters, page: target }, basePath)

  const pages = buildPageWindow(page, pageCount)

  return (
    <nav aria-label="分页" className="mt-12 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="px-3 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-signal-muted transition-colors hover:text-white"
        >
          上一页
        </Link>
      ) : (
        <span className="px-3 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-signal-border">
          上一页
        </span>
      )}

      {pages.map((entry, index) =>
        entry === null ? (
          <span key={`gap-${index}`} className="px-2 text-signal-dim">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={
              entry === page
                ? 'min-w-9 border-b border-white px-2 py-2 text-center text-xs text-white'
                : 'min-w-9 px-2 py-2 text-center text-xs text-signal-dim transition-colors hover:text-white'
            }
          >
            {entry}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="px-3 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-signal-muted transition-colors hover:text-white"
        >
          下一页
        </Link>
      ) : (
        <span className="px-3 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-signal-border">
          下一页
        </span>
      )}
    </nav>
  )
}

/** 1 … 4 5 [6] 7 8 … 20 */
function buildPageWindow(page: number, pageCount: number): (number | null)[] {
  const window = new Set<number>([1, pageCount, page - 1, page, page + 1])
  const sorted = [...window].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b)

  const result: (number | null)[] = []
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push(null)
    result.push(value)
    previous = value
  }
  return result
}
