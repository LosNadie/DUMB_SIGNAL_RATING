import Link from 'next/link'

import { AdminPageHeader, AdminPrimaryLink, AdminSearchForm } from '@/components/admin/page-header'
import { AdminTable, type AdminRow } from '@/components/admin/admin-table'
import { listAdminReviews } from '@/server/content-service'

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { q, status } = await searchParams
  const rows = await listAdminReviews(q)
  const visible = status === 'DRAFT' ? rows.filter((row) => row.status === 'DRAFT') : rows

  const mapped: AdminRow[] = visible.map((row) => ({
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
      <AdminPageHeader
        title="音乐管理"
        description="乐评的创建、编辑与发布。"
        count={mapped.length}
        actions={<AdminPrimaryLink href="/admin/reviews/new">+ 新建乐评</AdminPrimaryLink>}
      />

      <AdminSearchForm action="/admin/reviews" placeholder="搜索专辑或艺人…" defaultValue={q} />

      <AdminTable rows={mapped} type="review" basePath="/admin/reviews" publicBase="/music" />

      {q && mapped.length === 0 && (
        <p className="py-8 text-center text-sm text-signal-dim">
          没有匹配「{q}」的内容。
        </p>
      )}

      {status === 'DRAFT' && (
        <p className="mt-4 text-[0.68rem] text-signal-dim">
          当前只显示草稿。
          <Link href="/admin/reviews" className="ml-2 text-white underline underline-offset-4">
            显示全部
          </Link>
        </p>
      )}
    </div>
  )
}
