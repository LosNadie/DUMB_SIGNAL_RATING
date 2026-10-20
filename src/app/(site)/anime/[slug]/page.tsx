import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { CommentSection } from '@/components/detail/comment-section'
import { DetailHero } from '@/components/detail/detail-hero'
import { Prose } from '@/components/detail/prose'
import { ViewTracker } from '@/components/detail/view-tracker'
import { JsonLd } from '@/components/seo/json-ld'
import { getAnimeById, getAnimeBySlug } from '@/lib/data/anime'
import { listComments } from '@/lib/data/comments'
import { getCurrentUser } from '@/lib/auth/session'
import { formatDate, formatViews } from '@/lib/format'
import { animeJsonLd, breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { buildMetadata, contentTitle } from '@/lib/seo/metadata'
import { isNumericId } from '@/lib/slug'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function resolveAnime(rawSlug: string) {
  const decoded = decodeURIComponent(rawSlug)
  if (isNumericId(decoded)) {
    return { anime: await getAnimeById(Number(decoded)), legacyId: true }
  }
  return { anime: await getAnimeBySlug(decoded), legacyId: false }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { anime } = await resolveAnime(slug)
  if (!anime) return { title: '动漫不存在', robots: { index: false, follow: false } }

  return buildMetadata({
    title: contentTitle(anime.title, anime.studio),
    description: anime.excerpt,
    path: `/anime/${anime.slug}`,
    image: anime.coverImage || anime.backgroundImage,
    type: 'article',
    publishedTime: anime.publishedAt,
    modifiedTime: anime.updatedAt,
    keywords: [anime.title, anime.studio, ...anime.genres.map((genre) => genre.name), '动漫'],
  })
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { slug } = await params
  const { anime, legacyId } = await resolveAnime(slug)
  if (!anime) notFound()
  if (legacyId) permanentRedirect(`/anime/${encodeURIComponent(anime.slug)}`)

  const [comments, user] = await Promise.all([listComments('ANIME', anime.id), getCurrentUser()])
  const path = `/anime/${anime.slug}`
  const description = anime.excerpt ?? ''

  return (
    <>
      <JsonLd
        data={[
          animeJsonLd({
            title: anime.title,
            path,
            description,
            score: Number(anime.score),
            image: anime.coverImage || anime.backgroundImage,
            studio: anime.studio,
            releaseDate: anime.releaseDate,
            genres: anime.genres.map((genre) => genre.name),
            publishedAt: anime.publishedAt,
          }),
          breadcrumbJsonLd([
            { name: '首页', path: '/' },
            { name: '动漫', path: '/anime' },
            { name: anime.title, path },
          ]),
        ]}
      />
      <ViewTracker type="anime" id={anime.id} />

      <DetailHero
        eyebrow={`ANIME / ARCHIVE${anime.releaseDate ? ` / ${formatDate(anime.releaseDate).slice(0, 4)}` : ''}`}
        title={anime.title}
        subtitle={anime.studio}
        score={Number(anime.score)}
        imageUrl={anime.coverImage}
        backgroundImage={anime.backgroundImage || anime.coverImage}
        genres={anime.genres.map((genre) => genre.name)}
        facts={[
          { label: '年份', value: anime.releaseDate ? formatDate(anime.releaseDate).slice(0, 4) : '未知' },
          { label: '制作', value: anime.studio },
          { label: '作者', value: anime.author.username },
          { label: '发布', value: anime.publishedAt ? formatDate(anime.publishedAt) : '—' },
          { label: '浏览', value: formatViews(anime.views) },
        ]}
      />

      <article className="mx-auto max-w-[760px] px-5 py-12 md:px-8 md:py-16">
        <Prose html={anime.contentHtml} />
        <CommentSection
          targetType="ANIME"
          targetId={anime.id}
          path={path}
          comments={comments}
          user={user}
        />
      </article>
    </>
  )
}
