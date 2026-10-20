import type { Metadata } from 'next'
import Link from 'next/link'

import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: '登录',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams

  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="signal-logo mb-10 block text-center text-2xl text-white transition-opacity hover:opacity-70"
        >
          DUMB
        </Link>
        <p className="mb-8 text-center text-[0.7rem] uppercase tracking-[0.24em] text-signal-dim">
          Access the archive
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  )
}
