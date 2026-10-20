'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Input, Label } from '@/components/ui/input'
import { resolveImageUrl } from '@/lib/images'

/**
 * Uploads a file to /api/admin/upload and stores the returned `/uploads/...`
 * path in a hidden input. The visible text input still allows pasting a URL.
 */
export function ImageUploader({
  name,
  label,
  defaultValue = '',
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Keep the preview in sync when an AI draft sets a new cover.
  useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue])

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/admin/upload', { method: 'POST', body })
      const data = (await response.json()) as { url?: string; error?: { message?: string } }
      if (!response.ok || !data.url) {
        throw new Error(data.error?.message ?? '上传失败')
      }
      setValue(data.url)
      toast.success('图片已上传')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder ?? '/uploads/… 或图片链接'}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 border border-signal-border px-3 text-[0.66rem] uppercase tracking-[0.14em] text-signal-muted transition-colors hover:border-white hover:text-white disabled:opacity-50"
        >
          {uploading ? '上传中…' : '上传'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>
      {value && (
        <div className="relative mt-2 h-28 w-20 overflow-hidden border border-signal-border bg-signal-panel">
          <Image src={resolveImageUrl(value)} alt="预览" fill sizes="80px" className="object-cover" />
        </div>
      )}
    </div>
  )
}
