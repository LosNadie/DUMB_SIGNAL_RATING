import type { Metadata } from 'next'
import Link from 'next/link'

import { CatalogFilters } from '@/components/catalog/catalog-filters'
import { CatalogHeader } from '@/components/catalog/catalog-header'
import { CoverCard } from '@/components/catalog/cover-card'
import { CatalogPagination } from '@/components/catalog/pagination'
import { JsonLd } from '@/components/seo/json-ld'
import { listMovies, listMovieRegions } from '@/lib/data/movies'
import { listGenresForType } from '@/lib/data/reviews'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata } from '@/lib/seo/metadata'
import { canonicalListPath, hasActiveFilters, parseListFilters } from '@/lib/search-params'

const BASE = '/movie'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const filters = parseListFilters(await searchParams, { withRegion: true })

  return buildMetadata({
    title: '电影',
    description: '电影档案：剧情、传记、类型片与作者电影，按地区、类型与评分检索 DUMB SIGNAL 的电影评论。',
    path: canonicalListPath(filters, BASE),
    noindex: Boolean(filters.q),
    ...(hasActiveFilters(filters) ? {} : { keywords: ['电影', '影评', '电影评分'] }),
  })
}

export default async function MovieListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseListFilters(await searchParams, { withRegion: true })
  const [{ items, total, page, pageCount }, genres, regions] = await Promise.all([
    listMovies(filters),
    listGenresForType('movie'),
    listMovieRegions(),
  ])

  return (
    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '首页', path: '/' },
          { name: '电影', path: BASE },
        ])}
      />

      <CatalogHeader
        label="Movie / Archive"
        title="电影"
        description="银幕上的另一种时间。按地区与类型检索全部电影评论。"
        count={total}
      />

      <CatalogFilters
        basePath={BASE}
        filters={filters}
        genres={genres.map((genre) => ({ label: genre.name, value: genre.slug }))}
        sortLabel="排序"
        genreLabel="全部类型"
        searchPlaceholder="搜索片名、导演或演员…"
        total={total}
        extra={{
          label: '地区',
          name: 'region',
          placeholder: '全部地区',
          options: regions.map((region) => ({ label: region, value: region })),
        }}
      />

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-signal-dim">没有匹配的电影</p>
          <Link href={BASE} className="mt-4 inline-block text-xs text-signal-muted underline underline-offset-4 hover:text-white">
            查看全部
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 py-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((movie, index) => (
            <CoverCard
              key={movie.id}
              href={`/movie/${movie.slug}`}
              title={movie.title}
              meta={movie.director}
              imageUrl={movie.coverImage || movie.backgroundImage}
              score={Number(movie.score)}
              eyebrow={`MOVIE / ${movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'ARCHIVE'}`}
              genres={movie.genres.map((genre) => genre.name)}
              priority={index < 4}
            />
          ))}
        </div>
      )}

      <CatalogPagination basePath={BASE} filters={filters} page={page} pageCount={pageCount} />
      <div className="h-16" />
    </div>
  )
}
