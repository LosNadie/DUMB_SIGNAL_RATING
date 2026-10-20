import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { isProduction } from '@/lib/env'
import { prisma } from '@/lib/prisma'

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  isEditorRole,
  signSession,
  verifySession,
  type SessionPayload,
} from './jwt'

export interface CurrentUser extends SessionPayload {
  email: string
  avatar: string | null
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}

/**
 * Read the session and confirm the account still exists and is enabled.
 * Middleware only verifies the signature; every privileged action calls this
 * so a disabled or deleted account cannot keep using an old token.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession()
  if (!session) return null

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, email: true, avatar: true, role: true, status: true },
  })
  if (!user || user.status !== 'ENABLED') return null

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

export async function requireEditor(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!isEditorRole(user.role)) redirect('/')
  return user
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export { isEditorRole }
