import Link from 'next/link'

import { AdminTable, type AdminRow } from '@/components/admin/admin-table'
import { listAdminReviews } from '@/server/content-service'

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const rows = await listAdminReviews(q)

  const mapped: AdminRow[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.album.title,
    subtitle: row.album.artist,
    status: row.status,
    score: Number(row.score),
    coverImage: row.coverImage || row.album.coverImage,
    updatedAt: row.updatedAt,
  }))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-white">音乐管理</h1>
        <Link
          href="/admin/reviews/new"
          className="border border-white bg-white px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-300"
        >
          + 新建乐评
        </Link>
      </div>

      <form method="get" className="mt-6 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索专辑或艺人…"
          className="h-9 w-full max-w-xs border border-signal-border bg-transparent px-3 text-sm text-white placeholder:text-signal-dim focus:border-white focus:outline-none"
        />
        <button
          type="submit"
          className="h-9 border border-signal-border px-4 text-[0.68rem] uppercase tracking-[0.16em] text-signal-muted hover:border-white hover:text-white"
        >
          搜索
        </button>
        {q && (
          <Link href="/admin/reviews" className="flex items-center px-2 text-xs text-signal-dim hover:text-white">
            重置
          </Link>
        )}
      </form>

      <div className="mt-6">
        <AdminTable rows={mapped} type="review" basePath="/admin/reviews" publicBase="/music" />
      </div>
    </div>
  )
}
