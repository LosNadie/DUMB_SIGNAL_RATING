import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import { env } from '@/lib/env'

const ALLOWED_INPUT = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_EDGE = 1920
const QUALITY = 82
const REMOTE_MAX_BYTES = 10 * 1024 * 1024

export function uploadDirectory(): string {
  return path.resolve(env.UPLOAD_DIR)
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true })
}

/**
 * Compress and store an uploaded image as webp. Mirrors the old
 * Thumbnailator behaviour: only downscale when the long edge exceeds 1920px.
 */
export async function saveUploadedImage(buffer: Buffer, mimeType: string): Promise<string> {
  if (!ALLOWED_INPUT.has(mimeType)) {
    throw new Error('只支持 JPG / PNG / WebP / GIF 图片')
  }
  if (buffer.byteLength > env.MAX_UPLOAD_BYTES) {
    throw new Error(`图片不能超过 ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)}MB`)
  }

  const dir = uploadDirectory()
  await ensureDir(dir)

  const pipeline = sharp(buffer, { animated: mimeType === 'image/gif' }).rotate()
  const metadata = await pipeline.metadata()
  const longEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0)

  let output = pipeline
  if (longEdge > MAX_EDGE) {
    output = output.resize({
      width: (metadata.width ?? 0) >= (metadata.height ?? 0) ? MAX_EDGE : undefined,
      height: (metadata.height ?? 0) > (metadata.width ?? 0) ? MAX_EDGE : undefined,
      withoutEnlargement: true,
    })
  }

  const filename = `${randomUUID()}.webp`
  const encoded = await output.webp({ quality: QUALITY }).toBuffer()
  await writeFile(path.join(dir, filename), encoded)
  return `/uploads/${filename}`
}

/**
 * Download a remote image (AI providers return cover/poster URLs) and store
 * it locally. Returns the original URL if anything goes wrong, matching the
 * previous backend's fallback behaviour.
 */
export async function saveRemoteImage(url: string): Promise<string> {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url

    const response = await fetch(parsed, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'DUMB-SIGNAL/1.0' },
    })
    if (!response.ok) return url

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    if (contentLength > REMOTE_MAX_BYTES) return url

    const mime = (response.headers.get('content-type') ?? '').split(';')[0]
    if (!ALLOWED_INPUT.has(mime)) return url

    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength > REMOTE_MAX_BYTES) return url

    return await saveUploadedImage(Buffer.from(arrayBuffer), mime)
  } catch {
    return url
  }
}
