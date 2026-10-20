'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

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

interface AiAssistProps {
  kind: 'review' | 'anime' | 'movie'
  onDraft: (draft: AiDraft) => void
}

/**
 * Calls the provider-backed AI draft endpoint. Requests can take up to two
 * minutes (Last.fm/TMDB/AniList + DeepSeek), so the button reports progress
 * and disables itself.
 */
export function AiAssist({ kind, onDraft }: AiAssistProps) {
  const [artist, setArtist] = useState('')
  const [albumTitle, setAlbumTitle] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    try {
      const body =
        kind === 'review' ? { artist, albumTitle, year } : { title }
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

  return (
    <section className="border border-signal-border p-4">
      <p className="text-[0.62rem] uppercase tracking-[0.2em] text-signal-dim">AI 辅助</p>
      <p className="mt-1 text-xs text-signal-muted">
        {kind === 'review'
          ? '从 Last.fm 拉取官方曲目，再由 DeepSeek 生成乐评草稿。'
          : kind === 'anime'
            ? '从 AniList 拉取元数据，未命中时由 DeepSeek 翻译或兜底生成。'
            : '从 TMDB 拉取海报与元数据，多候选时由 DeepSeek 消歧。'}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {kind === 'review' ? (
          <>
            <div>
              <Label htmlFor="ai-artist">艺人</Label>
              <Input id="ai-artist" value={artist} onChange={(event) => setArtist(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="ai-album">专辑</Label>
              <Input
                id="ai-album"
                value={albumTitle}
                onChange={(event) => setAlbumTitle(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ai-year">年份</Label>
              <Input
                id="ai-year"
                value={year}
                inputMode="numeric"
                onChange={(event) => setYear(event.target.value)}
              />
            </div>
          </>
        ) : (
          <div className="sm:col-span-2">
            <Label htmlFor="ai-title">作品名</Label>
            <Input id="ai-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4"
        disabled={loading || (kind === 'review' ? !artist || !albumTitle || !year : !title)}
        onClick={() => void run()}
      >
        {loading ? '生成中，最长约 2 分钟…' : '生成草稿'}
      </Button>
    </section>
  )
}
