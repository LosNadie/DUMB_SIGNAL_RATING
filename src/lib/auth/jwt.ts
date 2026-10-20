import { SignJWT, jwtVerify } from 'jose'

import { env } from '@/lib/env'

export const SESSION_COOKIE = 'dumb_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type SessionRole = 'ADMIN' | 'EDITOR' | 'USER'

export interface SessionPayload {
  userId: number
  username: string
  role: SessionRole
}

const secret = new TextEncoder().encode(env.AUTH_SECRET)
const algorithm = 'HS256'

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setProtectedHeader({ alg: algorithm })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret)
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [algorithm] })
    const userId = Number(payload.sub)
    const username = typeof payload.username === 'string' ? payload.username : ''
    const role = payload.role

    if (!Number.isInteger(userId) || userId <= 0 || !username) return null
    if (role !== 'ADMIN' && role !== 'EDITOR' && role !== 'USER') return null

    return { userId, username, role }
  } catch {
    return null
  }
}

export function isEditorRole(role: SessionRole | undefined | null): boolean {
  return role === 'ADMIN' || role === 'EDITOR'
}
