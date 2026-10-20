/**
 * Client-safe copy of the server session shape. Client components must not
 * import `lib/auth/session`, which pulls in Prisma and the environment.
 */
export type SessionRole = 'ADMIN' | 'EDITOR' | 'USER'

export interface CurrentUser {
  userId: number
  username: string
  email: string
  avatar: string | null
  role: SessionRole
}
