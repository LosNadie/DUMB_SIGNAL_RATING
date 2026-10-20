import type { Metadata } from 'next'
import Link from 'next/link'

import { requireUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { formatDateTime } from '@/lib/format'

export const metadata: Metadata = {
  title: '个人主页',
  robots: { index: false, follow: false },
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理员',
  EDITOR: '编辑',
  USER: '用户',
}

export default async function ProfilePage() {
  const user = await requireUser()

  const [comments, reviews] = await Promise.all([
    prisma.comment.findMany({
      where: { userId: user.userId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        review: { select: { slug: true, title: true } },
        anime: { select: { slug: true, title: true } },
        movie: { select: { slug: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    user.role === 'USER'
      ? Promise.resolve([])
      : prisma.review.findMany({
          where: { authorId: user.userId },
          select: { id: true, slug: true, title: true, publishedAt: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
  ])

  return (
    <div className="mx-auto max-w-[860px] px-5 py-14 md:px-8 md:py-20">
      <p className="text-[0.66rem] uppercase tracking-[0.26em] text-signal-dim">Profile</p>
      <h1 className="mt-3 font-display text-4xl text-white">{user.username}</h1>

      <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-signal-border py-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">邮箱</dt>
          <dd className="mt-1 break-all text-signal-fg/90">{user.email}</dd>
        </div>
        <div>
          <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">角色</dt>
          <dd className="mt-1 text-signal-fg/90">{ROLE_LABEL[user.role] ?? user.role}</dd>
        </div>
        <div>
          <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">评论</dt>
          <dd className="mt-1 text-signal-fg/90">{comments.length}</dd>
        </div>
        {(user.role === 'ADMIN' || user.role === 'EDITOR') && (
          <div>
            <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">操作</dt>
            <dd className="mt-1">
              <Link href="/admin" className="text-white underline underline-offset-4">
                后台管理
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <section className="mt-12">
        <h2 className="text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">我的评论</h2>
        {comments.length === 0 ? (
          <p className="mt-4 text-sm text-signal-dim">还没有发表过评论。</p>
        ) : (
          <ul className="mt-4 divide-y divide-signal-border border-y border-signal-border">
            {comments.map((comment) => {
              const target = comment.review
                ? { href: `/music/${comment.review.slug}`, label: comment.review.title }
                : comment.anime
                  ? { href: `/anime/${comment.anime.slug}`, label: comment.anime.title }
                  : comment.movie
                    ? { href: `/movie/${comment.movie.slug}`, label: comment.movie.title }
                    : null
              return (
                <li key={comment.id} className="py-4">
                  <div className="flex items-baseline gap-3">
                    {target ? (
                      <Link href={target.href} className="text-sm text-white hover:underline">
                        {target.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-signal-dim">内容已删除</span>
                    )}
                    <time className="text-[0.66rem] text-signal-dim">
                      {formatDateTime(comment.createdAt)}
                    </time>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-signal-muted">{comment.content}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {reviews.length > 0 && (
        <section className="mt-12">
          <h2 className="text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">我发布的乐评</h2>
          <ul className="mt-4 divide-y divide-signal-border border-y border-signal-border">
            {reviews.map((review) => (
              <li key={review.id} className="flex items-baseline justify-between py-3">
                <Link href={`/music/${review.slug}`} className="text-sm text-white hover:underline">
                  {review.title}
                </Link>
                <span className="text-[0.66rem] uppercase tracking-[0.14em] text-signal-dim">
                  {review.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
