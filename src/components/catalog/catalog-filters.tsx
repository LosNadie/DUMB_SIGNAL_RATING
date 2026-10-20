import Link from 'next/link'

import { cn } from '@/components/ui/cn'
import type { ListFilters } from '@/lib/search-params'
import { buildListQuery } from '@/lib/search-params'

export interface FilterOption {
  label: string
  value: string
}

export interface CatalogFiltersProps {
  basePath: string
  filters: ListFilters
  genres: FilterOption[]
  sortLabel: string
  genreLabel: string
  searchPlaceholder: string
  /** Optional extra select (anime year, movie region). */
  extra?: {
    label: string
    name: 'year' | 'region'
    options: FilterOption[]
    placeholder: string
  }
  total: number
}

/**
 * A plain GET form so filtering works without JavaScript. Sort controls are
 * real links, which keeps every result set crawlable and shareable.
 */
export function CatalogFilters({
  basePath,
  filters,
  genres,
  sortLabel,
  genreLabel,
  searchPlaceholder,
  extra,
  total,
}: CatalogFiltersProps) {
  const sortLinks = [
    { key: 'date-desc', label: '最新', sort: 'date', order: 'desc' },
    { key: 'score-desc', label: '评分高', sort: 'score', order: 'desc' },
    { key: 'date-asc', label: '最早', sort: 'date', order: 'asc' },
    { key: 'score-asc', label: '评分低', sort: 'score', order: 'asc' },
  ] as const

  return (
    <div className="border-y border-signal-border py-4">
      <form
        method="get"
        action={basePath}
        className="flex flex-col gap-3 md:flex-row md:items-center"
      >
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="catalog-q">
            搜索
          </label>
          <input
            id="catalog-q"
            name="q"
            defaultValue={filters.q}
            placeholder={searchPlaceholder}
            className="h-9 min-w-[12rem] flex-1 border border-signal-border bg-transparent px-3 text-sm text-white placeholder:text-signal-dim focus:border-white focus:outline-none md:max-w-xs"
          />

          <label className="sr-only" htmlFor="catalog-genre">
            {genreLabel}
          </label>
          <select
            id="catalog-genre"
            name="genre"
            defaultValue={filters.genre}
            className="h-9 border border-signal-border bg-signal-panel px-2 text-sm text-white focus:border-white focus:outline-none"
          >
            <option value="">{genreLabel}</option>
            {genres.map((genre) => (
              <option key={genre.value} value={genre.value}>
                {genre.label}
              </option>
            ))}
          </select>

          {extra && (
            <>
              <label className="sr-only" htmlFor={`catalog-${extra.name}`}>
                {extra.label}
              </label>
              <select
                id={`catalog-${extra.name}`}
                name={extra.name}
                defaultValue={filters[extra.name]}
                className="h-9 border border-signal-border bg-signal-panel px-2 text-sm text-white focus:border-white focus:outline-none"
              >
                <option value="">{extra.placeholder}</option>
                {extra.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}

          <input type="hidden" name="sort" value={filters.sort} />
          <input type="hidden" name="order" value={filters.order} />

          <button
            type="submit"
            className="h-9 border border-white bg-white px-4 text-[0.7rem] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-300"
          >
            筛选
          </button>

          {(filters.q || filters.genre || filters.year || filters.region) && (
            <Link
              href={basePath}
              className="text-[0.7rem] uppercase tracking-[0.18em] text-signal-dim transition-colors hover:text-white"
            >
              重置
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-[0.68rem] uppercase tracking-[0.18em] text-signal-dim sm:inline">
            {total} 条
          </span>
          <div className="flex items-center gap-1" aria-label={sortLabel}>
            {sortLinks.map((link) => {
              const active = filters.sort === link.sort && filters.order === link.order
              return (
                <Link
                  key={link.key}
                  href={buildListQuery(
                    { ...filters, sort: link.sort, order: link.order, page: 1 },
                    basePath,
                  )}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'px-2 py-1 text-[0.68rem] tracking-[0.12em] transition-colors',
                    active
                      ? 'text-white underline decoration-white/70 underline-offset-4'
                      : 'text-signal-dim hover:text-white',
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </form>
    </div>
  )
}
