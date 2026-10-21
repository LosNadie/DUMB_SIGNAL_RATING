'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

interface AiAssistProps {
  kind: 'review' | 'anime' | 'movie'
  onDraft: (draft: AiDraft) => void
}

/**
 * Calls the provider-backed AI draft endpoint. Requests can take up to two
 * minutes (Last.fm/TMDB/AniList + DeepSeek), so the button reports progress
 * and disables itself. Collapsed by default — it is a helper, not the main
 * editing surface.
 */
export function AiAssist({ kind, onDraft }: AiAssistProps) {
  const [open, setOpen] = useState(false)
  const [artist, setArtist] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const body = kind === 'review' ? { artist, albumTitle, year } : { title }
      const response = await fetch(`/api/admin/ai/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await response.json()) as { draft?: AiDraft; error?: { message?: string } }
      if (!response.ok || !data.draft) {
        throw new Error(data.error?.message ?? 'AI 生成失败')
      }
      onDraft(data.draft)
      toast.success('AI 草稿已生成，请检查后保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI 生成失败')
    } finally {
      setLoading(false)
    }
  }

  const hint =
    kind === 'review'
      ? '从 Last.fm 拉取官方曲目，再由 DeepSeek 生成乐评草稿。'
      : kind === 'anime'
        ? '从 AniList 拉取元数据，未命中时由 DeepSeek 翻译或兜底生成。'
        : '从 TMDB 拉取海报与元数据，多候选时由 DeepSeek 消歧。'

  const ready = kind === 'review' ? Boolean(artist && albumTitle && year) : Boolean(title)

  return (
    <section className="border border-signal-border bg-signal-panel/30">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-[0.62rem] uppercase tracking-[0.2em] text-signal-muted">AI 辅助</span>
          <span className="hidden text-[0.7rem] text-signal-dim sm:inline">{hint}</span>
        </span>
        <span className="shrink-0 text-signal-dim transition-transform duration-200" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div className="border-t border-signal-border px-4 py-4">
          <p className="mb-4 text-[0.7rem] text-signal-dim sm:hidden">{hint}</p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kind === 'review' ? (
              <>
                <div>
                  <Label htmlFor="ai-artist">艺人</Label>
                  <Input id="ai-artist" value={artist} onChange={(event) => setArtist(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ai-album">专辑</Label>
                  <Input id="ai-album" value={albumTitle} onChange={(event) => setAlbumTitle(event.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ai-year">年份</Label>
                  <Input
                    id="ai-year"
                    value={year}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(event) => setYear(event.target.value)}
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label htmlFor="ai-title">作品名</Label>
                <Input
                  id="ai-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={kind === 'anime' ? '例：葬送的芙莉莲' : '例：奥本海默'}
                />
              </div>
            )}

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading || !ready}
                onClick={() => void run()}
              >
                {loading ? '生成中…' : '生成草稿'}
              </Button>
            </div>
          </div>

          <p className="mt-3 text-[0.66rem] leading-relaxed text-signal-dim">
            AI 只填充表单，不会直接保存。生成最长需要约 2 分钟。
          </p>
        </div>
      )}
    </section>
  )
}

export type AiDraft = {
  title?: string
  content?: string
  description?: string
  score?: number
  coverImage?: string
  backgroundImage?: string
  studio?: string
  director?: string
  actors?: string
  genres?: string[]
  releaseDate?: string
  tracks?: string
  year?: string
  region?: string
}
