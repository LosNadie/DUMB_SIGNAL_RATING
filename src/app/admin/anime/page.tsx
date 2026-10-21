import { AdminPageHeader, AdminPrimaryLink, AdminSearchForm } from '@/components/admin/page-header'
import { AdminTable, type AdminRow } from '@/components/admin/admin-table'
import { listAdminAnime } from '@/server/content-service'

export default async function AdminAnimePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const rows = await listAdminAnime(q)

  const mapped: AdminRow[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.studio,
    status: row.status,
    score: Number(row.score),
    coverImage: row.coverImage,
    updatedAt: row.updatedAt,
  }))

  return (
    <div>
      <AdminPageHeader
        title="动漫管理"
        description="番剧的创建、编辑与发布。"
        count={mapped.length}
        actions={<AdminPrimaryLink href="/admin/anime/new">+ 新建动漫</AdminPrimaryLink>}
      />

      <AdminSearchForm action="/admin/anime" placeholder="搜索作品或制作公司…" defaultValue={q} />

      <AdminTable rows={mapped} type="anime" basePath="/admin/anime" publicBase="/anime" />

      {q && mapped.length === 0 && (
        <p className="py-8 text-center text-sm text-signal-dim">
          没有匹配「{q}」的内容。
        </p>
      )}
    </div>
  )
}
