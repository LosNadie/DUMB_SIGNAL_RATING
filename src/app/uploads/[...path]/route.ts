import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

import { uploadDirectory } from '@/lib/uploads'

export const runtime = 'nodejs'

const SAFE_NAME = /^[A-Za-z0-9_-]+\.(webp|jpg|jpeg|png|gif)$/

const CONTENT_TYPES: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
}

/**
 * Serves uploaded media from UPLOAD_DIR (a docker volume in production).
 * In development UPLOAD_DIR is `public/uploads`, so Next serves the file
 * directly and this route is only a fallback for production.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params
  const filename = segments.join('/')

  if (segments.length !== 1 || !SAFE_NAME.test(filename)) {
    return new Response('Not found', { status: 404 })
  }

  const filePath = path.join(uploadDirectory(), filename)
  if (!filePath.startsWith(uploadDirectory())) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const info = await stat(filePath)
    if (!info.isFile()) return new Response('Not found', { status: 404 })

    const extension = filename.split('.').pop() ?? ''
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream

    return new Response(stream, {
      headers: {
        'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
