'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { logoutAction } from '@/actions/auth'
import type { CurrentUser } from '@/types/auth'

export function UserMenu({ user }: { user: CurrentUser | null }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) {
    return (
      <Link
        href="/login"
        className="border border-signal-border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.2em] text-signal-muted transition-colors hover:border-white hover:text-white"
      >
        登录
      </Link>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 border border-signal-border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.2em] text-signal-muted transition-colors hover:border-white hover:text-white"
      >
        <span className="max-w-[8rem] truncate">{user.username}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 border border-signal-border bg-signal-panel py-1 shadow-2xl"
        >
          <Link
            href="/profile"
            role="menuitem"
            className="block px-4 py-2.5 text-xs text-signal-muted transition-colors hover:bg-white hover:text-black"
          >
            个人主页
          </Link>
          {(user.role === 'ADMIN' || user.role === 'EDITOR') && (
            <Link
              href="/admin"
              role="menuitem"
              className="block px-4 py-2.5 text-xs text-signal-muted transition-colors hover:bg-white hover:text-black"
            >
              后台管理
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void logoutAction().then(() => {
                setOpen(false)
                router.refresh()
              })
            }}
            className="block w-full px-4 py-2.5 text-left text-xs text-signal-muted transition-colors hover:bg-white hover:text-black"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  )
}
