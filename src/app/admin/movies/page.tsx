import { AdminPageHeader, AdminPrimaryLink, AdminSearchForm } from '@/components/admin/page-header'
import { AdminTable, type AdminRow } from '@/components/admin/admin-table'
import { listAdminMovies } from '@/server/content-service'

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const rows = await listAdminMovies(q)

  const mapped: AdminRow[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.director,
    status: row.status,
    score: Number(row.score),
    coverImage: row.coverImage,
    updatedAt: row.updatedAt,
  }))

  return (
    <div>
      <AdminPageHeader
        title="电影管理"
        description="影片的创建、编辑与发布。"
        count={mapped.length}
        actions={<AdminPrimaryLink href="/admin/movies/new">+ 新建电影</AdminPrimaryLink>}
      />

      <AdminSearchForm action="/admin/movies" placeholder="搜索片名或导演…" defaultValue={q} />

      <AdminTable rows={mapped} type="movie" basePath="/admin/movies" publicBase="/movie" />

      {q && mapped.length === 0 && (
        <p className="py-8 text-center text-sm text-signal-dim">
          没有匹配「{q}」的内容。
        </p>
      )}
    </div>
  )
}
