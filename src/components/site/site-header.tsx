import Link from 'next/link'

import type { CurrentUser } from '@/types/auth'

import { UserMenu } from './user-menu'

const NAV = [
  { href: '/music', label: 'MUSIC', zh: '音乐' },
  { href: '/anime', label: 'ANIME', zh: '动漫' },
  { href: '/movie', label: 'MOVIE', zh: '电影' },
]

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-signal-border bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-5 md:px-8">
        <Link href="/" className="signal-logo text-lg text-white transition-opacity hover:opacity-70">
          DUMB
        </Link>

        <nav aria-label="主导航" className="hidden items-center gap-1 sm:flex">
          {NAV.map((item, index) => (
            <span key={item.href} className="flex items-center">
              {index > 0 && <span className="px-2 text-neutral-700">/</span>}
              <Link
                href={item.href}
                className="px-1 py-2 text-[0.72rem] uppercase tracking-[0.22em] text-signal-muted transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/search"
            className="text-[0.72rem] uppercase tracking-[0.22em] text-signal-muted transition-colors hover:text-white"
          >
            搜索
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
