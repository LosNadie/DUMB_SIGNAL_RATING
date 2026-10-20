import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { JsonLd } from '@/components/seo/json-ld'
import { parseSearchQuery, searchContent, type SearchType } from '@/lib/data/search'
import { resolveImageUrl } from '@/lib/images'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  ...buildMetadata({
    title: '搜索',
    description: '在 DUMB SIGNAL 的音乐乐评、动漫与电影中搜索。',
    path: '/search',
    noindex: true,
  }),
  robots: { index: false, follow: true },
}

const TYPES: { value: SearchType; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'music', label: '音乐' },
  { value: 'anime', label: '动漫' },
  { value: 'movie', label: '电影' },
]

const TYPE_LABEL: Record<string, string> = { music: 'MUSIC', anime: 'ANIME', movie: 'MOVIE' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { q, type } = parseSearchQuery(params)
  const results = await searchContent(q, type)

  return (
    <div className="mx-auto max-w-[1000px] px-5 py-14 md:px-8">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: '首页', path: '/' },
          { name: '搜索', path: '/search' },
        ])}
      />

      <h1 className="font-display text-3xl text-white md:text-4xl">搜索</h1>
      <p className="mt-2 text-sm text-signal-muted">在乐评、动漫与电影中查找内容。</p>

      <form method="get" action="/search" className="mt-8">
        <div className="flex gap-2">
          <label htmlFor="search-q" className="sr-only">
            搜索关键词
          </label>
          <input
            id="search-q"
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="艺人、专辑、作品名…"
            className="h-11 flex-1 border border-signal-border bg-transparent px-4 text-sm text-white placeholder:text-signal-dim focus:border-white focus:outline-none"
          />
          <button
            type="submit"
            className="h-11 border border-white bg-white px-6 text-[0.7rem] uppercase tracking-[0.2em] text-black transition-colors hover:bg-neutral-300"
          >
            搜索
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {TYPES.map((item) => (
            <label
              key={item.value}
              className={`cursor-pointer border px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.16em] transition-colors ${
                type === item.value
                  ? 'border-white text-white'
                  : 'border-signal-border text-signal-dim hover:border-neutral-600 hover:text-white'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={item.value}
                defaultChecked={type === item.value}
                className="sr-only"
              />
              {item.label}
            </label>
          ))}
          <noscript>
            <button type="submit" className="border border-signal-border px-3 py-1.5 text-xs">
              应用类型
            </button>
          </noscript>
        </div>
      </form>

      {q && (
        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-signal-dim">
          「{q}」· {results.length} 条结果
        </p>
      )}

      {!q ? (
        <div className="mt-16 border-t border-signal-border pt-10">
          <p className="text-sm text-signal-dim">输入关键词开始搜索。</p>
        </div>
      ) : results.length === 0 ? (
        <div className="mt-10 border-t border-signal-border pt-10">
          <p className="text-sm text-signal-muted">没有找到匹配的内容。</p>
          <p className="mt-2 text-xs text-signal-dim">试试更短的关键词，或切换类型。</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-signal-border border-y border-signal-border">
          {results.map((result) => (
            <li key={`${result.type}-${result.id}`}>
              <Link
                href={result.path}
                className="group flex gap-5 py-5 transition-colors hover:bg-white/[0.02]"
              >
                <div className="relative h-24 w-16 shrink-0 overflow-hidden border border-signal-border bg-signal-panel">
                  <Image
                    src={resolveImageUrl(result.imageUrl)}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[0.6rem] uppercase tracking-[0.2em] text-signal-dim">
                      {TYPE_LABEL[result.type]}
                    </span>
                    <span className="text-[0.66rem] tabular-nums text-signal-dim">
                      {result.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 font-display text-lg text-white transition-colors group-hover:text-neutral-300">
                    {result.title}
                  </p>
                  <p className="text-xs text-signal-muted">{result.meta}</p>
                  {result.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-signal-dim">
                      {result.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
