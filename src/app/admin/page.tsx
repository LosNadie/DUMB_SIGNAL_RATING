import Link from 'next/link'

import { AdminPageHeader, AdminPrimaryLink } from '@/components/admin/page-header'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export default async function AdminDashboardPage() {
  const [reviews, anime, movies, drafts, users, comments, latest] = await Promise.all([
    prisma.review.count(),
    prisma.anime.count(),
    prisma.movie.count(),
    prisma.review.count({ where: { status: 'DRAFT' } }),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.review.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        views: true,
        updatedAt: true,
        album: { select: { title: true, artist: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    }),
  ])

  const total = reviews + anime + movies

  const cards = [
    { label: '乐评', value: reviews, href: '/admin/reviews', hint: 'Reviews', primary: true },
    { label: '动漫', value: anime, href: '/admin/anime', hint: 'Anime', primary: true },
    { label: '电影', value: movies, href: '/admin/movies', hint: 'Movies', primary: true },
  ]

  const secondary = [
    { label: '草稿', value: drafts, href: '/admin/reviews?status=DRAFT' },
    { label: '用户', value: users, href: null },
    { label: '评论', value: comments, href: null },
  ]

  return (
    <div>
      <AdminPageHeader
        title="概览"
        description="内容与社区数据一览。"
        actions={<AdminPrimaryLink href="/admin/reviews/new">+ 新建乐评</AdminPrimaryLink>}
      />

      {/* Primary metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group border border-signal-border bg-signal-panel/40 p-5 transition-colors hover:border-white/60 hover:bg-signal-panel"
          >
            <div className="flex items-baseline justify-between">
              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-signal-muted">{card.hint}</p>
              <span className="text-[0.66rem] text-signal-dim transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </div>
            <p className="mt-2 font-display text-4xl leading-none text-white">{card.value}</p>
            <p className="mt-2 text-sm text-signal-muted">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {secondary.map((item) => {
          const body = (
            <>
              <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">{item.label}</dt>
              <dd className="mt-1 font-display text-xl text-white">{item.value}</dd>
            </>
          )
          return item.href ? (
            <Link
              key={item.label}
              href={item.href}
              className="border border-signal-border p-4 transition-colors hover:border-neutral-600"
            >
              {body}
            </Link>
          ) : (
            <div key={item.label} className="border border-signal-border p-4">
              {body}
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[0.68rem] text-signal-dim">全站共 {total} 条内容。</p>

      <section className="mt-10">
        <div className="flex items-baseline justify-between border-b border-signal-border pb-3">
          <h2 className="text-[0.68rem] uppercase tracking-[0.22em] text-signal-muted">最近更新</h2>
          <Link
            href="/admin/reviews"
            className="text-[0.68rem] tracking-[0.14em] text-signal-dim transition-colors hover:text-white"
          >
            查看全部
          </Link>
        </div>

        {latest.length === 0 ? (
          <p className="py-10 text-sm text-signal-dim">还没有内容。</p>
        ) : (
          <ul className="divide-y divide-signal-border border-b border-signal-border">
            {latest.map((review) => (
              <li key={review.id}>
                <Link
                  href={`/admin/reviews/${review.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm text-white">{review.album.title}</p>
                    <p className="line-clamp-1 text-xs text-signal-dim">{review.album.artist}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-[0.66rem] text-signal-dim">
                    <span className="tabular-nums">{review.views} 浏览</span>
                    <span
                      className={
                        review.status === 'PUBLISHED' ? 'text-emerald-400' : 'text-amber-400'
                      }
                    >
                      {review.status === 'PUBLISHED' ? '已发布' : '草稿'}
                    </span>
                    <time className="w-32 text-right tabular-nums">{formatDateTime(review.updatedAt)}</time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
