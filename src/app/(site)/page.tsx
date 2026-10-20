import type { Metadata } from 'next'
import Link from 'next/link'

import { FeaturedCarousel } from '@/components/home/featured-carousel'
import { JsonLd } from '@/components/seo/json-ld'
import { getHomeData } from '@/lib/data/home'
import { websiteJsonLd } from '@/lib/seo/jsonld'
import { SITE_DESCRIPTION, SITE_TAGLINE } from '@/lib/seo/metadata'
import { buildMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMetadata({
  title: `${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  path: '/',
  keywords: ['乐评', '动漫', '电影', '评分社区', 'DUMB SIGNAL'],
})

const SECTIONS = [
  {
    href: '/music',
    label: 'MUSIC',
    title: '音乐乐评',
    description: '专辑、听觉经验与场景记忆。',
    key: 'music' as const,
  },
  {
    href: '/anime',
    label: 'ANIME',
    title: '动漫',
    description: '故事结束之后才开始的理解。',
    key: 'anime' as const,
  },
  {
    href: '/movie',
    label: 'MOVIE',
    title: '电影',
    description: '银幕上的另一种时间。',
    key: 'movie' as const,
  },
]

export default async function HomePage() {
  const { featured, counts } = await getHomeData()

  return (
    <>
      <JsonLd data={websiteJsonLd()} />

      {/* Static hero: fully server-rendered so crawlers see real content. */}
      <section className="signal-grain relative overflow-hidden border-b border-signal-border">
        <div className="signal-grain-layer" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              'radial-gradient(60% 55% at 50% 30%, #171717 0%, #0a0a0a 45%, #000 100%)',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 72%)',
          }}
        />

        <div className="mx-auto max-w-[1280px] px-5 pb-14 pt-16 md:px-8 md:pb-20 md:pt-24">
          <p className="signal-label mb-6">Archive of sound · image · story</p>

          <h1 className="signal-logo text-6xl leading-none text-white sm:text-7xl md:text-8xl">
            DUMB
          </h1>

          <p className="mt-6 max-w-xl font-display text-xl leading-relaxed text-neutral-300 md:text-2xl">
            {SITE_TAGLINE}
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-signal-muted">
            这里收录专辑乐评、动漫与电影。我们相信克制的文字比喧哗更接近作品本身。
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/music"
              className="border border-white bg-white px-6 py-3 text-[0.7rem] uppercase tracking-[0.22em] text-black transition-colors hover:bg-neutral-300"
            >
              浏览乐评
            </Link>
            <Link
              href="/search"
              className="border border-signal-border px-6 py-3 text-[0.7rem] uppercase tracking-[0.22em] text-signal-muted transition-colors hover:border-white hover:text-white"
            >
              搜索全部
            </Link>
          </div>
        </div>
      </section>

      {/* Featured + category index */}
      <section className="mx-auto max-w-[1280px] px-5 py-14 md:px-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">
                最新信号
              </h2>
              <Link href="/music" className="text-[0.66rem] text-signal-dim transition-colors hover:text-white">
                全部 →
              </Link>
            </div>
            <FeaturedCarousel items={featured} />
          </div>

          <div>
            <h2 className="mb-4 text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">
              分类
            </h2>
            <ul className="divide-y divide-signal-border border-y border-signal-border">
              {SECTIONS.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    className="group flex items-center justify-between gap-4 py-6 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.62rem] uppercase tracking-[0.24em] text-signal-dim">
                        {section.label}
                      </p>
                      <p className="mt-1 font-display text-xl text-white transition-colors group-hover:text-neutral-300">
                        {section.title}
                      </p>
                      <p className="mt-1 text-xs text-signal-muted">{section.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[0.66rem] tabular-nums text-signal-dim">
                        {counts[section.key]}
                      </span>
                      <span className="text-signal-dim transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white">
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-8 border border-signal-border p-5">
              <p className="text-[0.62rem] uppercase tracking-[0.24em] text-signal-dim">About</p>
              <p className="mt-2 text-sm leading-relaxed text-signal-muted">
                DUMB SIGNAL 是一个个人向的影音档案。没有算法推荐，只有认真写下的判断。
              </p>
              <Link
                href="/about"
                className="mt-4 inline-block text-[0.66rem] uppercase tracking-[0.18em] text-white underline underline-offset-4 decoration-neutral-700 hover:decoration-white"
              >
                了解更多
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
