import 'server-only'

import { cache } from 'react'

import { prisma } from '@/lib/prisma'

export type CommentTarget = 'REVIEW' | 'ANIME' | 'MOVIE'

export interface CommentView {
  id: number
  content: string
  parentId: number | null
  createdAt: Date
  user: { id: number; username: string; avatar: string | null }
  replies: CommentView[]
}

export function targetWhere(type: CommentTarget, id: number) {
  if (type === 'REVIEW') return { reviewId: id }
  if (type === 'ANIME') return { animeId: id }
  return { movieId: id }
}

/**
 * Comments for one target, ordered oldest first and grouped one level deep
 * (the old schema only supported direct replies too).
 */
export const listComments = cache(
  async (type: CommentTarget, id: number): Promise<CommentView[]> => {
    const rows = await prisma.comment.findMany({
      where: targetWhere(type, id),
      select: {
        id: true,
        content: true,
        parentId: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const roots: CommentView[] = []
    const byId = new Map<number, CommentView>()

    for (const row of rows) {
      if (row.parentId === null) {
        const view: CommentView = { ...row, replies: [] }
        roots.push(view)
        byId.set(row.id, view)
      }
    }
    for (const row of rows) {
      if (row.parentId === null) continue
      const parent = byId.get(row.parentId)
      if (parent) {
        parent.replies.push({ ...row, replies: [] })
      } else {
        // Orphaned reply (parent deleted) — surface it as a root comment.
        const view: CommentView = { ...row, replies: [] }
        roots.push(view)
        byId.set(row.id, view)
      }
    }

    return roots
  },
)

export async function countComments(type: CommentTarget, id: number): Promise<number> {
  return prisma.comment.count({ where: targetWhere(type, id) })
}
