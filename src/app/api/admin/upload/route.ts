import { NextResponse } from 'next/server'

import { getCurrentUser, isEditorRole } from '@/lib/auth/session'
import { env } from '@/lib/env'
import { saveUploadedImage } from '@/lib/uploads'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !isEditorRole(user.role)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '无权限上传' } },
      { status: 403 },
    )
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: '缺少文件' } },
      { status: 400 },
    )
  }
  if (file.size > env.MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `图片不能超过 ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)}MB`,
        },
      },
      { status: 413 },
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await saveUploadedImage(buffer, file.type)
    return NextResponse.json({ url })
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : '上传失败',
        },
      },
      { status: 400 },
    )
  }
}
