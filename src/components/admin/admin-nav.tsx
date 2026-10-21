'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/components/ui/cn'

const NAV = [
  { href: '/admin', label: '概览' },
  { href: '/admin/reviews', label: '音乐' },
  { href: '/admin/anime', label: '动漫' },
  { href: '/admin/movies', label: '电影' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="后台导航" className="flex flex-1 items-center gap-0.5 overflow-x-auto">
      {NAV.map((item) => {
        // `/admin` must only match itself, not every child route.
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative whitespace-nowrap px-2.5 py-1.5 text-[0.72rem] tracking-[0.1em] transition-colors md:px-3',
              active ? 'text-white' : 'text-signal-muted hover:text-white',
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-2 -bottom-px h-px bg-white transition-transform duration-200',
                active ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </Link>
        )
      })}
    </nav>
  )
}
