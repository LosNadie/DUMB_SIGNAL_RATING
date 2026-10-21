import type { Metadata } from 'next'
import Link from 'next/link'

import { AdminNav } from '@/components/admin/admin-nav'
import { requireEditor } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: '后台管理',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEditor()
  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="min-h-svh bg-black">
      <header className="sticky top-0 z-40 border-b border-signal-border bg-black/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 md:gap-6 md:px-6">
          <Link href="/admin" className="signal-logo shrink-0 text-sm text-white">
            DUMB
          </Link>
          <span className="shrink-0 border border-signal-border px-1.5 py-0.5 text-[0.58rem] uppercase tracking-[0.18em] text-signal-dim">
            Admin
          </span>

          <AdminNav />

          <div className="flex shrink-0 items-center gap-3 md:gap-4">
            <span className="hidden items-center gap-2 text-[0.68rem] text-signal-dim sm:flex">
              <span className="text-signal-muted">{user.username}</span>
              {isAdmin && (
                <span className="border border-white/30 px-1.5 py-px text-[0.56rem] uppercase tracking-[0.14em] text-white">
                  ADMIN
                </span>
              )}
            </span>
            <Link
              href="/"
              className="text-[0.68rem] tracking-[0.1em] text-signal-dim transition-colors hover:text-white"
            >
              返回站点
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-7 md:px-6 md:py-10">{children}</div>
    </div>
  )
}
