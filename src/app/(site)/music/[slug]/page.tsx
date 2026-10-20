import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { CommentSection } from '@/components/detail/comment-section'
import { DetailHero } from '@/components/detail/detail-hero'
import { Prose } from '@/components/detail/prose'
import { TrackList } from '@/components/detail/track-list'
import { ViewTracker } from '@/components/detail/view-tracker'
import { JsonLd } from '@/components/seo/json-ld'
import { listComments } from '@/lib/data/comments'
import { getReviewById, getReviewBySlug } from '@/lib/data/reviews'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDate, formatViews } from '@/lib/format'
import { breadcrumbJsonLd, reviewJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata, contentTitle } from '@/lib/seo/metadata'
import { isNumericId } from '@/lib/slug'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function resolveReview(rawSlug: string) {
  const decoded = decodeURIComponent(rawSlug)
  if (isNumericId(decoded)) {
    const byId = await getReviewById(Number(decoded))
    return { review: byId, legacyId: true }
  }
  return { review: await getReviewBySlug(decoded), legacyId: false }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { review } = await resolveReview(slug)
  if (!review) {
    return { title: '乐评不存在', robots: { index: false, follow: false } }
  }

  return buildMetadata({
    title: contentTitle(review.album.title, review.album.artist),
    description: review.excerpt,
    path: `/music/${review.slug}`,
    image: review.coverImage || review.album.coverImage,
    type: 'article',
    publishedTime: review.publishedAt,
    modifiedTime: review.updatedAt,
    keywords: [
      review.album.title,
      review.album.artist,
      ...review.album.genres.map((genre) => genre.name),
      '乐评',
    ],
  })
}

export default async function ReviewDetailPage({ params }: PageProps) {
  const { slug } = await params
  const { review, legacyId } = await resolveReview(slug)

  if (!review) notFound()
  if (legacyId) permanentRedirect(`/music/${review.slug}`)

  const [comments, user] = await Promise.all([
    listComments('REVIEW', review.id),
    getCurrentUser(),
  ])

  const path = `/music/${review.slug}`
  const description = review.excerpt ?? ''

  return (
    <>
      <JsonLd
        data={[
          reviewJsonLd({
            title: review.album.title,
            path,
            description,
            score: Number(review.score),
            image: review.coverImage || review.album.coverImage,
            publishedAt: review.publishedAt,
            authorName: review.author.username,
            album: {
              title: review.album.title,
              artist: review.album.artist,
              releaseDate: review.album.releaseDate,
              genres: review.album.genres.map((genre) => genre.name),
            },
          }),
          breadcrumbJsonLd([
            { name: '首页', path: '/' },
            { name: '音乐乐评', path: '/music' },
            { name: review.album.title, path },
          ]),
        ]}
      />
      <ViewTracker type="review" id={review.id} />

      <DetailHero
        eyebrow={`MUSIC / REVIEW${review.album.releaseDate ? ` / ${formatDate(review.album.releaseDate).slice(0, 4)}` : ''}`}
        title={review.album.title}
        subtitle={review.album.artist}
        score={Number(review.score)}
        imageUrl={review.coverImage || review.album.coverImage}
        backgroundImage={review.backgroundImage}
        genres={review.album.genres.map((genre) => genre.name)}
        facts={[
          { label: '年份', value: review.album.releaseDate ? formatDate(review.album.releaseDate).slice(0, 4) : '未知' },
          { label: '厂牌', value: review.album.label || '—' },
          { label: '作者', value: review.author.username },
          { label: '发布', value: review.publishedAt ? formatDate(review.publishedAt) : '—' },
          { label: '浏览', value: formatViews(review.views) },
          { label: '曲目', value: review.tracks.length ? `${review.tracks.length} 首` : '—' },
        ]}
      />

      <article className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <Prose html={review.contentHtml} />
        <TrackList tracks={review.tracks} mvUrl={review.mvUrl} />
        <CommentSection
          targetType="REVIEW"
          targetId={review.id}
          path={path}
          comments={comments}
          user={user}
        />
      </article>
    </>
  )
}
