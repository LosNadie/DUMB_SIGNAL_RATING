import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const schema = z.object({
  type: z.enum(['review', 'anime', 'movie']),
  id: z.number().int().positive(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'invalid JSON' } }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'invalid payload' } }, { status: 400 })
  }

  const { type, id } = parsed.data

  try {
    if (type === 'review') {
      await prisma.review.updateMany({ where: { id, status: 'PUBLISHED' }, data: { views: { increment: 1 } } })
    } else if (type === 'anime') {
      await prisma.anime.updateMany({ where: { id, status: 'PUBLISHED' }, data: { views: { increment: 1 } } })
    } else {
      await prisma.movie.updateMany({ where: { id, status: 'PUBLISHED' }, data: { views: { increment: 1 } } })
    }
  } catch {
    // Counting views must never break the page.
    return NextResponse.json({ ok: false }, { status: 202 })
  }

  return NextResponse.json({ ok: true })
}
