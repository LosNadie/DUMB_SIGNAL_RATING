'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { targetWhere, type CommentTarget } from '@/lib/data/comments'

export interface CommentActionState {
  ok?: boolean
  error?: string
  /** True when an existing top-level comment was updated instead of created. */
  updated?: boolean
}

const targetSchema = z.enum(['REVIEW', 'ANIME', 'MOVIE'])

const createSchema = z.object({
  targetType: targetSchema,
  targetId: z.coerce.number().int().positive(),
  content: z.string().trim().min(1, '评论内容不能为空').max(2000, '评论最多 2000 字'),
  parentId: z.coerce.number().int().positive().optional().nullable(),
  path: z.string().startsWith('/').optional(),
})

function targetExists(type: CommentTarget, id: number) {
  if (type === 'REVIEW') return prisma.review.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true } })
  if (type === 'ANIME') return prisma.anime.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true } })
  return prisma.movie.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true } })
}

export async function submitCommentAction(
  _previous: CommentActionState | undefined,
  formData: FormData,
): Promise<CommentActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: '请先登录后再评论' }

  const parsed = createSchema.safeParse({
    targetType: formData.get('targetType'),
    targetId: formData.get('targetId'),
    content: formData.get('content'),
    parentId: formData.get('parentId') || null,
    path: formData.get('path') || undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '评论格式不正确' }
  }

  const { targetType, targetId, content, parentId, path } = parsed.data
  const target = await targetExists(targetType, targetId)
  if (!target) return { error: '内容不存在或已下线' }

  const where = targetWhere(targetType, targetId)

  if (!parentId) {
    // Preserve the legacy rule: one top-level comment per user per target.
    const existing = await prisma.comment.findFirst({
      where: { ...where, userId: user.userId, parentId: null },
      select: { id: true },
    })

    if (existing) {
      await prisma.comment.update({ where: { id: existing.id }, data: { content } })
      if (path) revalidatePath(path)
      return { ok: true, updated: true }
    }
  } else {
    const parent = await prisma.comment.findFirst({
      where: { id: parentId, ...where },
      select: { id: true },
    })
    if (!parent) return { error: '回复的评论不存在' }
  }

  await prisma.comment.create({
    data: {
      userId: user.userId,
      content,
      parentId: parentId ?? null,
      reviewId: targetType === 'REVIEW' ? targetId : null,
      animeId: targetType === 'ANIME' ? targetId : null,
      movieId: targetType === 'MOVIE' ? targetId : null,
    },
  })

  if (path) revalidatePath(path)
  return { ok: true }
}

export async function deleteCommentAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser()
  if (!user) return

  const id = Number(formData.get('id'))
  const path = String(formData.get('path') ?? '')
  if (!Number.isInteger(id) || id <= 0) return

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
  if (!comment) return

  const isOwner = comment.userId === user.userId
  const isEditor = user.role === 'ADMIN' || user.role === 'EDITOR'
  if (!isOwner && !isEditor) return

  // Delete the comment and its direct replies (same behaviour as before).
  await prisma.comment.deleteMany({ where: { OR: [{ id }, { parentId: id }] } })

  if (path.startsWith('/')) revalidatePath(path)
}
