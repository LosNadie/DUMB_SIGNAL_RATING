import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE, isEditorRole, verifySession } from '@/lib/auth/jwt'

/**
 * Edge-safe gate for /admin and /profile.
 *
 * Only the JWT signature is checked here (no database access). The admin
 * layout and every admin server action re-validate the account against the
 * database, so a stale token cannot grant access on its own.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/admin') && !isEditorRole(session.role)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/profile'],
}
