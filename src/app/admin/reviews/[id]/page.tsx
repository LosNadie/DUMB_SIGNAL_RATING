import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentForm } from '@/components/admin/content-form'
import { getAdminReview } from '@/server/content-service'
import { formatDate } from '@/lib/format'

export default async function EditReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string }>
}) {
  const { id } = await params
  const { saved } = await searchParams
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) notFound()

  const review = await getAdminReview(numericId)
  if (!review) notFound()

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">
            {review.album.title} <span className="text-signal-dim">/ {review.album.artist}</span>
          </h1>
          <p className="mt-1 text-xs text-signal-dim">
            #{review.id} · {review.status === 'PUBLISHED' ? '已发布' : '草稿'}
            {review.album.releaseDate ? ` · ${formatDate(review.album.releaseDate).slice(0, 4)}` : ''}
          </p>
        </div>
        <Link
          href={`/music/${review.slug}`}
          target="_blank"
          className="text-[0.68rem] uppercase tracking-[0.16em] text-signal-muted underline underline-offset-4 hover:text-white"
        >
          前台查看 ↗
        </Link>
      </div>

      {saved && (
        <p className="mt-4 border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          已保存。
        </p>
      )}

      <div className="mt-8">
        <ContentForm
          kind="review"
          values={{
            id: review.id,
            slug: review.slug,
            artist: review.album.artist,
            albumTitle: review.album.title,
            label: review.album.label ?? '',
            releaseDate: review.album.releaseDate?.toISOString() ?? null,
            tracks: review.tracks,
            title: review.title,
            mvUrl: review.mvUrl ?? '',
            excerpt: review.excerpt ?? '',
            contentHtml: review.contentHtml,
            coverImage: review.coverImage ?? '',
            backgroundImage: review.backgroundImage ?? '',
            score: Number(review.score),
            status: review.status,
            genres: review.album.genres.map((genre) => genre.name),
          }}
        />
      </div>
    </div>
  )
}
