import Image from 'next/image'
import Link from 'next/link'

import { deleteContentAction } from '@/actions/admin/content'
import { resolveImageUrl } from '@/lib/images'
import { formatDateTime } from '@/lib/format'

export interface AdminRow {
  id: number
  slug: string
  title: string
  subtitle: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  score: number | string
  coverImage: string | null
  updatedAt: Date
  views?: number
}

const STATUS_LABEL: Record<AdminRow['status'], string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

const STATUS_STYLE: Record<AdminRow['status'], string> = {
  DRAFT: 'text-amber-400',
  PUBLISHED: 'text-emerald-400',
  ARCHIVED: 'text-signal-dim',
}

export function AdminTable({
  rows,
  type,
  basePath,
  publicBase,
}: {
  rows: AdminRow[]
  type: 'review' | 'anime' | 'movie'
  basePath: string
  publicBase: string
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-signal-border px-6 py-16 text-center">
        <p className="text-sm text-signal-dim">暂无内容。</p>
        <Link href={`${basePath}/new`} className="mt-3 inline-block text-xs text-white underline underline-offset-4">
          新建第一条
        </Link>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-signal-border border-y border-signal-border">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center gap-4 py-3">
          <div className="relative h-16 w-12 shrink-0 overflow-hidden border border-signal-border bg-signal-panel">
            <Image src={resolveImageUrl(row.coverImage)} alt="" fill sizes="48px" className="object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <Link href={`${basePath}/${row.id}`} className="line-clamp-1 text-sm text-white hover:underline">
              {row.title}
            </Link>
            <p className="line-clamp-1 text-xs text-signal-dim">{row.subtitle}</p>
          </div>

          <div className="hidden items-center gap-6 text-[0.66rem] text-signal-dim sm:flex">
            <span className="tabular-nums">{Number(row.score).toFixed(1)}</span>
            {row.views !== undefined && <span className="tabular-nums">{row.views} 浏览</span>}
            <span className={STATUS_STYLE[row.status]}>{STATUS_LABEL[row.status]}</span>
            <time className="tabular-nums">{formatDateTime(row.updatedAt)}</time>
          </div>

          <div className="flex shrink-0 items-center gap-3 text-[0.66rem]">
            <Link href={`${publicBase}/${row.slug}`} target="_blank" className="text-signal-dim hover:text-white">
              查看
            </Link>
            <Link href={`${basePath}/${row.id}`} className="text-signal-muted hover:text-white">
              编辑
            </Link>
            <form action={deleteContentAction}>
              <input type="hidden" name="type" value={type} />
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" className="text-signal-dim transition-colors hover:text-red-400">
                删除
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  )
}
