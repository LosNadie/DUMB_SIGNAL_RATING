import type { Metadata } from 'next'
import Link from 'next/link'

import { CatalogFilters } from '@/components/catalog/catalog-filters'
import { CatalogHeader } from '@/components/catalog/catalog-header'
import { CoverCard } from '@/components/catalog/cover-card'
import { CatalogPagination } from '@/components/catalog/pagination'
import { JsonLd } from '@/components/seo/json-ld'
import { listAnime, listAnimeYears } from '@/lib/data/anime'
import { listGenresForType } from '@/lib/data/reviews'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata } from '@/lib/seo/metadata'
import { canonicalListPath, hasActiveFilters, parseListFilters } from '@/lib/search-params'

const BASE = '/anime'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const filters = parseListFilters(await searchParams, { withYear: true })

  return buildMetadata({
    title: '动漫',
    description: '动漫档案：从奇幻冒险到日常治愈，按年份、风格与评分检索 DUMB SIGNAL 的动漫记录。',
    path: canonicalListPath(filters, BASE),
    noindex: Boolean(filters.q),
    ...(hasActiveFilters(filters) ? {} : { keywords: ['动漫', '动画推荐', '番剧评分'] }),
  })
}

export default async function AnimeListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseListFilters(await searchParams, { withYear: true })
  const [{ items, total, page, pageCount }, genres, years] = await Promise.all([
    listAnime(filters),
    listGenresForType('anime'),
    listAnimeYears(),
  ])

  return (
    <div className="mx-auto max-w-[1280px] px-5 md:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '首页', path: '/' },
          { name: '动漫', path: BASE },
        ])}
      />

      <CatalogHeader
        label="Anime / Archive"
        title="动漫"
        description="在故事结束之后，我们才开始理解它。按年份与类型翻阅全部动漫记录。"
        count={total}
      />

      <CatalogFilters
        basePath={BASE}
        filters={filters}
        genres={genres.map((genre) => ({ label: genre.name, value: genre.slug }))}
        sortLabel="排序"
        genreLabel="全部类型"
        searchPlaceholder="搜索作品或制作公司…"
        total={total}
        extra={{
          label: '年份',
          name: 'year',
          placeholder: '全部年份',
          options: years.map((year) => ({ label: String(year), value: String(year) })),
        }}
      />

      {items.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-signal-dim">没有匹配的动漫</p>
          <Link href={BASE} className="mt-4 inline-block text-xs text-signal-muted underline underline-offset-4 hover:text-white">
            查看全部
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 py-10 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((anime, index) => (
            <CoverCard
              key={anime.id}
              href={`/anime/${anime.slug}`}
              title={anime.title}
              meta={anime.studio}
              imageUrl={anime.coverImage || anime.backgroundImage}
              score={Number(anime.score)}
              eyebrow={`ANIME / ${anime.releaseDate ? new Date(anime.releaseDate).getFullYear() : 'ARCHIVE'}`}
              genres={anime.genres.map((genre) => genre.name)}
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
