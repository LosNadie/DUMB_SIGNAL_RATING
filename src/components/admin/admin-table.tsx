'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { deleteContentAction } from '@/actions/admin/content'
import { formatDateTime } from '@/lib/format'
import { resolveImageUrl } from '@/lib/images'

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
  DRAFT: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  PUBLISHED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  ARCHIVED: 'border-signal-border bg-signal-panel text-signal-dim',
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
  const router = useRouter()
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-signal-border px-6 py-20 text-center">
        <p className="text-sm text-signal-dim">暂无内容。</p>
        <Link
          href={`${basePath}/new`}
          className="mt-4 inline-block border border-white bg-white px-4 py-2 text-[0.68rem] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-300"
        >
          新建第一条
        </Link>
      </div>
    )
  }

  async function performDelete(row: AdminRow) {
    setPendingId(row.id)
    const form = new FormData()
    form.set('type', type)
    form.set('id', String(row.id))
    try {
      await deleteContentAction(form)
    } finally {
      startTransition(() => {
        setPendingId(null)
        setConfirmId(null)
        router.refresh()
      })
    }
  }

  return (
    <ul className="divide-y divide-signal-border border-y border-signal-border">
      {rows.map((row) => {
        const busy = pendingId === row.id
        const confirming = confirmId === row.id

        return (
          <li
            key={row.id}
            className={`flex flex-wrap items-center gap-4 py-3 transition-opacity ${busy ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="relative h-14 w-10 shrink-0 overflow-hidden border border-signal-border bg-signal-panel">
              <Image
                src={resolveImageUrl(row.coverImage)}
                alt=""
                fill
                sizes="40px"
                className="object-cover"
                onError={(event) => {
                  // Remote covers (Last.fm/TMDB) are often unreachable; hide
                  // the broken image instead of showing a torn icon.
                  event.currentTarget.style.display = 'none'
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`${basePath}/${row.id}`}
                className="line-clamp-1 text-sm text-white transition-colors hover:text-neutral-300"
              >
                {row.title}
              </Link>
              <p className="line-clamp-1 text-xs text-signal-dim">{row.subtitle}</p>
            </div>

            {/* Desktop metrics */}
            <div className="hidden items-center gap-5 lg:flex">
              <span className="w-9 text-right text-[0.7rem] tabular-nums text-signal-muted">
                {Number(row.score).toFixed(1)}
              </span>
              {row.views !== undefined && (
                <span className="w-16 text-right text-[0.7rem] tabular-nums text-signal-dim">
                  {row.views}
                </span>
              )}
              <span
                className={`min-w-14 border px-2 py-0.5 text-center text-[0.62rem] tracking-[0.08em] ${STATUS_STYLE[row.status]}`}
              >
                {STATUS_LABEL[row.status]}
              </span>
              <time className="w-32 text-right text-[0.7rem] tabular-nums text-signal-dim">
                {formatDateTime(row.updatedAt)}
              </time>
            </div>

            {/* Mobile: status only */}
            <span className={`border px-2 py-0.5 text-[0.62rem] lg:hidden ${STATUS_STYLE[row.status]}`}>
              {STATUS_LABEL[row.status]}
            </span>

            <div className="flex shrink-0 items-center gap-1">
              <Link
                href={`${publicBase}/${row.slug}`}
                target="_blank"
                title="前台查看"
                className="px-2 py-1 text-[0.68rem] text-signal-dim transition-colors hover:text-white"
              >
                查看
              </Link>
              <Link
                href={`${basePath}/${row.id}`}
                className="border border-signal-border px-2.5 py-1 text-[0.68rem] text-signal-muted transition-colors hover:border-white hover:text-white"
              >
                编辑
              </Link>

              {confirming ? (
                <span className="flex items-center gap-1.5 border border-red-900/60 bg-red-950/40 px-2 py-1">
                  <span className="text-[0.66rem] text-red-200">确认删除？</span>
                  <button
                    type="button"
                    onClick={() => void performDelete(row)}
                    disabled={busy}
                    className="text-[0.66rem] text-red-300 underline underline-offset-2 hover:text-red-100 disabled:opacity-50"
                  >
                    {busy ? '删除中' : '删除'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="text-[0.66rem] text-signal-dim hover:text-white"
                  >
                    取消
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(row.id)}
                  title="删除"
                  className="px-2 py-1 text-[0.68rem] text-signal-dim transition-colors hover:text-red-400"
                >
                  删除
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
