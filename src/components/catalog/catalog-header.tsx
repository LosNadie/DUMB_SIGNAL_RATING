import Link from 'next/link'

export function CatalogHeader({
  title,
  label,
  description,
  count,
}: {
  title: string
  label: string
  description: string
  count: number
}) {
  return (
    <div className="pb-6 pt-12">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-signal-dim transition-colors hover:text-white"
      >
        ← 返回首页
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[0.68rem] uppercase tracking-[0.26em] text-signal-dim">{label}</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">{title}</h1>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-signal-muted">{description}</p>
      </div>
      <p className="mt-4 text-[0.68rem] uppercase tracking-[0.18em] text-signal-dim">
        共 {count} 条信号
      </p>
    </div>
  )
}
