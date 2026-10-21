import { notFound } from 'next/navigation'

import { ContentForm } from '@/components/admin/content-form'
import { EditPageHeader } from '@/components/admin/edit-page-header'
import { getAdminMovie } from '@/server/content-service'

export default async function EditMoviePage({
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

  const movie = await getAdminMovie(numericId)
  if (!movie) notFound()

  return (
    <div>
      <EditPageHeader
        basePath="/admin/movies"
        id={movie.id}
        title={movie.title}
        subtitle={movie.director}
        status={movie.status}
        publicHref={`/movie/${encodeURIComponent(movie.slug)}`}
        saved={saved === '1'}
      />

      <ContentForm
        kind="movie"
        values={{
          id: movie.id,
          slug: movie.slug,
          title: movie.title,
          director: movie.director,
          actors: movie.actors,
          region: movie.region ?? '',
          releaseDate: movie.releaseDate?.toISOString() ?? null,
          excerpt: movie.excerpt ?? '',
          contentHtml: movie.contentHtml,
          coverImage: movie.coverImage ?? '',
          backgroundImage: movie.backgroundImage ?? '',
          score: Number(movie.score),
          status: movie.status,
          genres: movie.genres.map((genre) => genre.name),
        }}
      />
    </div>
  )
}
