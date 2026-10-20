import type { Metadata } from 'next'
import Link from 'next/link'

import { requireEditor } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: '后台管理',
  robots: { index: false, follow: false },
}

const NAV = [
  { href: '/admin', label: '概览' },
  { href: '/admin/reviews', label: '音乐' },
  { href: '/admin/anime', label: '动漫' },
  { href: '/admin/movies', label: '电影' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEditor()

  return (
    <div className="min-h-svh bg-black">
      <header className="sticky top-0 z-40 border-b border-signal-border bg-black/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-5">
          <Link href="/admin" className="signal-logo text-sm text-white">
            DUMB
          </Link>
          <span className="hidden text-[0.62rem] uppercase tracking-[0.22em] text-signal-dim sm:inline">
            Admin
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.16em] text-signal-muted transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-[0.68rem] text-signal-dim">
            <span className="hidden sm:inline">{user.username}</span>
            <Link href="/" className="transition-colors hover:text-white">
              返回站点
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-[1400px] px-5 py-8">{children}</div>
    </div>
  )
}
