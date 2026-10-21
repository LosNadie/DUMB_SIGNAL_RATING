import Link from 'next/link'

import { cn } from '@/components/ui/cn'

export function AdminPageHeader({
  title,
  description,
  count,
  actions,
}: {
  title: string
  description?: string
  count?: number
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-signal-border pb-5">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl text-white md:text-3xl">{title}</h1>
          {count !== undefined && (
            <span className="text-[0.7rem] tabular-nums text-signal-dim">{count}</span>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-signal-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function AdminPrimaryLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center gap-1.5 border border-white bg-white px-4 py-2',
        'text-[0.68rem] uppercase tracking-[0.18em] text-black transition-colors hover:bg-neutral-300',
      )}
    >
      {children}
    </Link>
  )
}

export function AdminSearchForm({
  action,
  placeholder,
  defaultValue,
  children,
}: {
  action: string
  placeholder: string
  defaultValue?: string
  children?: React.ReactNode
}) {
  return (
    <form method="get" action={action} className="mb-5 flex flex-wrap items-center gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label="搜索内容"
        className="h-9 w-full max-w-[18rem] border border-signal-border bg-signal-panel px-3 text-sm text-white placeholder:text-signal-dim transition-colors focus:border-white focus:outline-none"
      />
      {children}
      <button
        type="submit"
        className="h-9 border border-signal-border px-4 text-[0.68rem] uppercase tracking-[0.16em] text-signal-muted transition-colors hover:border-white hover:text-white"
      >
        搜索
      </button>
      {defaultValue && (
        <Link
          href={action}
          className="px-2 py-2 text-[0.68rem] tracking-[0.14em] text-signal-dim transition-colors hover:text-white"
        >
          重置
        </Link>
      )}
    </form>
  )
}
