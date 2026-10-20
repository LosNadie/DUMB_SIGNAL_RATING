import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentForm } from '@/components/admin/content-form'
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">{movie.title}</h1>
          <p className="mt-1 text-xs text-signal-dim">
            #{movie.id} · {movie.status === 'PUBLISHED' ? '已发布' : '草稿'} · {movie.director}
          </p>
        </div>
        <Link
          href={`/movie/${movie.slug}`}
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
    </div>
  )
}
