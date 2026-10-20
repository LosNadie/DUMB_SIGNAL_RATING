import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { CommentSection } from '@/components/detail/comment-section'
import { DetailHero } from '@/components/detail/detail-hero'
import { Prose } from '@/components/detail/prose'
import { ViewTracker } from '@/components/detail/view-tracker'
import { JsonLd } from '@/components/seo/json-ld'
import { listComments } from '@/lib/data/comments'
import { getMovieById, getMovieBySlug } from '@/lib/data/movies'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDate, formatViews } from '@/lib/format'
import { breadcrumbJsonLd, movieJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata, contentTitle } from '@/lib/seo/metadata'
import { isNumericId } from '@/lib/slug'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function resolveMovie(rawSlug: string) {
  const decoded = decodeURIComponent(rawSlug)
  if (isNumericId(decoded)) {
    return { movie: await getMovieById(Number(decoded)), legacyId: true }
  }
  return { movie: await getMovieBySlug(decoded), legacyId: false }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { movie } = await resolveMovie(slug)
  if (!movie) return { title: '电影不存在', robots: { index: false, follow: false } }

  return buildMetadata({
    title: contentTitle(movie.title, movie.director),
    description: movie.excerpt,
    path: `/movie/${movie.slug}`,
    image: movie.coverImage || movie.backgroundImage,
    type: 'article',
    publishedTime: movie.publishedAt,
    modifiedTime: movie.updatedAt,
    keywords: [movie.title, movie.director, ...movie.genres.map((genre) => genre.name), '电影', '影评'],
  })
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params
  const { movie, legacyId } = await resolveMovie(slug)
  if (!movie) notFound()
  if (legacyId) permanentRedirect(`/movie/${movie.slug}`)

  const [comments, user] = await Promise.all([listComments('MOVIE', movie.id), getCurrentUser()])
  const path = `/movie/${movie.slug}`
  const description = movie.excerpt ?? ''

  return (
    <>
      <JsonLd
        data={[
          movieJsonLd({
            title: movie.title,
            path,
            description,
            score: Number(movie.score),
            image: movie.coverImage || movie.backgroundImage,
            director: movie.director,
            actors: movie.actors,
            releaseDate: movie.releaseDate,
            genres: movie.genres.map((genre) => genre.name),
            publishedAt: movie.publishedAt,
          }),
          breadcrumbJsonLd([
            { name: '首页', path: '/' },
            { name: '电影', path: '/movie' },
            { name: movie.title, path },
          ]),
        ]}
      />
      <ViewTracker type="movie" id={movie.id} />

      <DetailHero
        eyebrow={`MOVIE / ARCHIVE${movie.releaseDate ? ` / ${formatDate(movie.releaseDate).slice(0, 4)}` : ''}`}
        title={movie.title}
        subtitle={movie.director}
        score={Number(movie.score)}
        imageUrl={movie.coverImage}
        backgroundImage={movie.backgroundImage || movie.coverImage}
        genres={movie.genres.map((genre) => genre.name)}
        facts={[
          { label: '年份', value: movie.releaseDate ? formatDate(movie.releaseDate).slice(0, 4) : '未知' },
          { label: '导演', value: movie.director },
          { label: '地区', value: movie.region || '—' },
          { label: '演员', value: movie.actors.slice(0, 3).join(' / ') || '—' },
          { label: '发布', value: movie.publishedAt ? formatDate(movie.publishedAt) : '—' },
          { label: '浏览', value: formatViews(movie.views) },
        ]}
      />

      <article className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <Prose html={movie.contentHtml} />
        <CommentSection
          targetType="MOVIE"
          targetId={movie.id}
          path={path}
          comments={comments}
          user={user}
        />
      </article>
    </>
  )
}
