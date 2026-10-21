import { notFound } from 'next/navigation'

import { ContentForm } from '@/components/admin/content-form'
import { EditPageHeader } from '@/components/admin/edit-page-header'
import { formatDate } from '@/lib/format'
import { getAdminReview } from '@/server/content-service'

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

  const releaseYear = review.album.releaseDate
    ? formatDate(review.album.releaseDate).slice(0, 4)
    : '未知'

  return (
    <div>
      <EditPageHeader
        basePath="/admin/reviews"
        id={review.id}
        title={review.album.title}
        subtitle={review.album.artist}
        status={review.status}
        meta={[{ label: '年份', value: releaseYear }]}
        publicHref={`/music/${encodeURIComponent(review.slug)}`}
        saved={saved === '1'}
      />

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
  )
}
