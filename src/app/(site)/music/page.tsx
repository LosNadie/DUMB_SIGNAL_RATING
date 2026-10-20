import type { Metadata } from 'next'
import Link from 'next/link'

import { CatalogFilters } from '@/components/catalog/catalog-filters'
import { CatalogHeader } from '@/components/catalog/catalog-header'
import { CoverCard } from '@/components/catalog/cover-card'
import { CatalogPagination } from '@/components/catalog/pagination'
import { JsonLd } from '@/components/seo/json-ld'
import { listGenresForType, listReviews } from '@/lib/data/reviews'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata } from '@/lib/seo/metadata'
import { canonicalListPath, hasActiveFilters, parseListFilters } from '@/lib/search-params'

const BASE = '/music'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const filters = parseListFilters(await searchParams)
  const active = hasActiveFilters(filters) || filters.page > 1

  return buildMetadata({
    title: '音乐乐评',
    description:
      '专辑乐评档案：从流行、摇滚到电子与 R&B，按评分与时间浏览 DUMB SIGNAL 的音乐写作。',
    path: canonicalListPath(filters, BASE),
    noindex: Boolean(filters.q),
    ...(active ? {} : { keywords: ['乐评', '专辑推荐', '音乐评分'] }),
  })
}

export default async function MusicListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseListFilters(await searchParams)
  const [{ items, total, page, pageCount }, genres] = await Promise.all([
    listReviews(filters),
    listGenresForType('music'),
  ])

  return (
    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '首页', path: '/' },
          { name: '音乐乐评', path: BASE },
        ])}
      />

      <CatalogHeader
        label="Music / Review"
        title="音乐乐评"
        description="一张专辑，一段听觉经验。按时间或评分检索全部乐评。"
        count={total}
      />

      <CatalogFilters
        basePath={BASE}
        filters={filters}
        genres={genres.map((genre) => ({ label: genre.name, value: genre.slug }))}
        sortLabel="排序"
        genreLabel="全部风格"
        searchPlaceholder="搜索专辑或艺人…"
        total={total}
      />

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-signal-dim">没有匹配的乐评</p>
          <Link href={BASE} className="mt-4 inline-block text-xs text-signal-muted underline underline-offset-4 hover:text-white">
            查看全部
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 py-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((review, index) => (
            <CoverCard
              key={review.id}
              href={`/music/${review.slug}`}
              title={review.album.title}
              meta={review.album.artist}
              imageUrl={review.coverImage || review.album.coverImage}
              score={Number(review.score)}
              eyebrow={`MUSIC / ${review.album.releaseDate ? new Date(review.album.releaseDate).getFullYear() : 'ARCHIVE'}`}
              genres={review.album.genres.map((genre) => genre.name)}
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
