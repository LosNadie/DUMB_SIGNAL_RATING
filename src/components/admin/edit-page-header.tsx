import Link from 'next/link'

import { cn } from '@/components/ui/cn'
import { formatDate } from '@/lib/format'

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  PUBLISHED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  ARCHIVED: 'border-signal-border bg-signal-panel text-signal-dim',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

export function EditPageHeader({
  basePath,
  id,
  title,
  subtitle,
  status,
  meta,
  publicHref,
  saved,
}: {
  basePath: string
  id: number
  title: string
  subtitle?: string
  status: string
  meta?: { label: string; value: string }[]
  publicHref: string
  saved?: boolean
}) {
  return (
    <div className="mb-7 border-b border-signal-border pb-5">
      <Link
        href={basePath}
        className="mb-4 inline-flex items-center gap-1.5 text-[0.68rem] tracking-[0.14em] text-signal-dim transition-colors hover:text-white"
      >
        ← 返回列表
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl leading-tight text-white md:text-3xl">{title}</h1>
            <span
              className={cn(
                'border px-2 py-0.5 text-[0.62rem] tracking-[0.08em]',
                STATUS_STYLE[status] ?? STATUS_STYLE.ARCHIVED,
              )}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>
          {subtitle && <p className="mt-1.5 text-sm text-signal-muted">{subtitle}</p>}
          <p className="mt-1 text-[0.68rem] text-signal-dim">
            #{id}
            {meta?.map((item) => ` · ${item.value}`).join('')}
          </p>
        </div>

        <Link
          href={publicHref}
          target="_blank"
          className="shrink-0 border border-signal-border px-3 py-1.5 text-[0.68rem] tracking-[0.14em] text-signal-muted transition-colors hover:border-white hover:text-white"
        >
          前台查看 ↗
        </Link>
      </div>

      {saved && (
        <p className="mt-5 border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-300">
          已保存。
        </p>
      )}
    </div>
  )
}

/** Re-exported so edit pages keep a single import for the date helper. */
export { formatDate }
