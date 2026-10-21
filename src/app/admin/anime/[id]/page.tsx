import { notFound } from 'next/navigation'

import { ContentForm } from '@/components/admin/content-form'
import { EditPageHeader } from '@/components/admin/edit-page-header'
import { getAdminAnime } from '@/server/content-service'

export default async function EditAnimePage({
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

  const anime = await getAdminAnime(numericId)
  if (!anime) notFound()

  return (
    <div>
      <EditPageHeader
        basePath="/admin/anime"
        id={anime.id}
        title={anime.title}
        subtitle={anime.studio}
        status={anime.status}
        publicHref={`/anime/${encodeURIComponent(anime.slug)}`}
        saved={saved === '1'}
      />

      <ContentForm
        kind="anime"
        values={{
          id: anime.id,
          slug: anime.slug,
          title: anime.title,
          studio: anime.studio,
          releaseDate: anime.releaseDate?.toISOString() ?? null,
          excerpt: anime.excerpt ?? '',
          contentHtml: anime.contentHtml,
          coverImage: anime.coverImage ?? '',
          backgroundImage: anime.backgroundImage ?? '',
          score: Number(anime.score),
          status: anime.status,
          genres: anime.genres.map((genre) => genre.name),
        }}
      />
    </div>
  )
}
