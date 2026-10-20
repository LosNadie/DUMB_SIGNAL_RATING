import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ContentForm } from '@/components/admin/content-form'
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-white">{anime.title}</h1>
          <p className="mt-1 text-xs text-signal-dim">
            #{anime.id} · {anime.status === 'PUBLISHED' ? '已发布' : '草稿'} · {anime.studio}
          </p>
        </div>
        <Link
          href={`/anime/${anime.slug}`}
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
    </div>
  )
}
