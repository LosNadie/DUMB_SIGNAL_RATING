import Link from 'next/link'

import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/format'

export default async function AdminDashboardPage() {
  const [reviews, anime, movies, drafts, users, comments, latest] = await Promise.all([
    prisma.review.count(),
    prisma.anime.count(),
    prisma.movie.count(),
    prisma.review.count({ where: { status: 'DRAFT' } }),
    prisma.user.count(),
    prisma.comment.count(),
    prisma.review.findMany({
      select: { id: true, title: true, status: true, updatedAt: true, views: true },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
  ])

  const stats = [
    { label: '乐评', value: reviews, href: '/admin/reviews' },
    { label: '动漫', value: anime, href: '/admin/anime' },
    { label: '电影', value: movies, href: '/admin/movies' },
    { label: '草稿', value: drafts, href: '/admin/reviews?status=DRAFT' },
    { label: '用户', value: users, href: null },
    { label: '评论', value: comments, href: null },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl text-white">概览</h1>
      <p className="mt-1 text-sm text-signal-muted">内容与社区数据一览。</p>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => {
          const body = (
            <>
              <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">
                {stat.label}
              </dt>
              <dd className="mt-1 font-display text-2xl text-white">{stat.value}</dd>
            </>
          )
          return stat.href ? (
            <Link
              key={stat.label}
              href={stat.href}
              className="border border-signal-border p-4 transition-colors hover:border-white/60"
            >
              {body}
            </Link>
          ) : (
            <div key={stat.label} className="border border-signal-border p-4">
              {body}
            </div>
          )
        })}
      </dl>

      <section className="mt-12">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">
            最近更新
          </h2>
          <Link href="/admin/reviews/new" className="text-[0.68rem] uppercase tracking-[0.16em] text-white underline underline-offset-4">
            + 新建乐评
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-signal-border border-y border-signal-border">
          {latest.map((review) => (
            <li key={review.id}>
              <Link
                href={`/admin/reviews/${review.id}`}
                className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <span className="truncate text-sm text-white">{review.title}</span>
                <span className="flex shrink-0 items-center gap-4 text-[0.66rem] text-signal-dim">
                  <span>{review.views} 浏览</span>
                  <span className={review.status === 'PUBLISHED' ? 'text-emerald-400' : 'text-amber-400'}>
                    {review.status === 'PUBLISHED' ? '已发布' : '草稿'}
                  </span>
                  <time>{formatDateTime(review.updatedAt)}</time>
                </span>
              </Link>
            </li>
          ))}
          {latest.length === 0 && (
            <li className="py-6 text-sm text-signal-dim">还没有内容。</li>
          )}
        </ul>
      </section>
    </div>
  )
}
