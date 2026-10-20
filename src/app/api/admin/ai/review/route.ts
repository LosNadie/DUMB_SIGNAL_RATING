import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser, isEditorRole } from '@/lib/auth/session'
import { IntegrationError } from '@/lib/integrations/deepseek'
import { generateReviewDraft } from '@/lib/integrations/assist/review'

export const runtime = 'nodejs'
export const maxDuration = 300

const schema = z.object({
  artist: z.string().trim().min(1, '请填写艺人'),
  albumTitle: z.string().trim().min(1, '请填写专辑名'),
  year: z.string().trim().regex(/^(19|20)\d{2}$/, '年份格式应为 4 位数字'),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !isEditorRole(user.role)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: '无权限' } }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? '参数错误' } },
      { status: 400 },
    )
  }

  try {
    const draft = await generateReviewDraft(parsed.data)
    return NextResponse.json({ draft })
  } catch (error) {
    if (error instanceof IntegrationError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      )
    }
    return NextResponse.json(
      { error: { code: 'AI_FAILED', message: error instanceof Error ? error.message : '生成失败' } },
      { status: 500 },
    )
  }
}
