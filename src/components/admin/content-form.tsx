'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  saveAnimeAction,
  saveMovieAction,
  saveReviewAction,
  type ContentActionState,
} from '@/actions/admin/content'
import { AiAssist, type AiDraft } from '@/components/admin/ai-assist'
import { ImageUploader } from '@/components/admin/image-uploader'
import { RichEditor } from '@/components/admin/rich-editor'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label, Textarea } from '@/components/ui/input'
import { GENRE_GROUP_LABELS, GENRES, type GenreGroup } from '@/lib/genres'

export type ContentKind = 'review' | 'anime' | 'movie'

export interface ContentFormValues {
  id?: number
  slug?: string
  title?: string
  excerpt?: string
  contentHtml?: string
  coverImage?: string
  backgroundImage?: string
  score?: number
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  genres?: string[]
  artist?: string
  albumTitle?: string
  label?: string
  tracks?: string[]
  mvUrl?: string
  studio?: string
  director?: string
  actors?: string[]
  region?: string
  releaseDate?: string | null
}

const initialState: ContentActionState = {}

const ACTIONS = {
  review: saveReviewAction,
  anime: saveAnimeAction,
  movie: saveMovieAction,
} as const

export function ContentForm({ kind, values }: { kind: ContentKind; values?: ContentFormValues }) {
  const [state, action, pending] = useActionState(ACTIONS[kind], initialState)
  const [status, setStatus] = useState(values?.status ?? 'DRAFT')
  const [draft, setDraft] = useState<AiDraft | null>(null)
  const [genres, setGenres] = useState<string[]>(values?.genres ?? [])
  const [contentHtml, setContentHtml] = useState(values?.contentHtml ?? '')

  useEffect(() => {
    if (state.error) toast.error(state.error)
  }, [state.error])

  function applyDraft(next: AiDraft) {
    setDraft(next)
    if (next.genres?.length) setGenres(next.genres)
    if (next.content) setContentHtml(next.content)
  }

  const v = (key: keyof ContentFormValues, fallback = '') =>
    (draft?.[key as keyof AiDraft] as string | undefined) ?? (values?.[key] as string | undefined) ?? fallback

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={action} className="space-y-8">
        {values?.id && <input type="hidden" name="id" value={values.id} />}
        <input type="hidden" name="status" value={status} />

        <section className="grid gap-5 md:grid-cols-2">
          {kind === 'review' ? (
            <>
              <div>
                <Label htmlFor="artist">艺人</Label>
                <Input id="artist" name="artist" defaultValue={v('artist')} required />
                <FieldError>{state.fieldErrors?.artist}</FieldError>
              </div>
              <div>
                <Label htmlFor="albumTitle">专辑名</Label>
                <Input id="albumTitle" name="albumTitle" defaultValue={v('albumTitle')} required />
                <FieldError>{state.fieldErrors?.albumTitle}</FieldError>
              </div>
              <div>
                <Label htmlFor="label">厂牌</Label>
                <Input id="label" name="label" defaultValue={v('label')} />
              </div>
            </>
          ) : kind === 'anime' ? (
            <>
              <div>
                <Label htmlFor="title">标题</Label>
                <Input id="title" name="title" defaultValue={v('title')} required />
                <FieldError>{state.fieldErrors?.title}</FieldError>
              </div>
              <div>
                <Label htmlFor="studio">制作公司</Label>
                <Input id="studio" name="studio" defaultValue={v('studio')} required />
                <FieldError>{state.fieldErrors?.studio}</FieldError>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="title">片名</Label>
                <Input id="title" name="title" defaultValue={v('title')} required />
                <FieldError>{state.fieldErrors?.title}</FieldError>
              </div>
              <div>
                <Label htmlFor="director">导演</Label>
                <Input id="director" name="director" defaultValue={v('director')} required />
                <FieldError>{state.fieldErrors?.director}</FieldError>
              </div>
              <div>
                <Label htmlFor="region">地区</Label>
                <Input id="region" name="region" defaultValue={v('region')} />
              </div>
              <div>
                <Label htmlFor="actorsText">演员（逗号分隔）</Label>
                <Input
                  id="actorsText"
                  name="actorsText"
                  defaultValue={draft?.actors ?? values?.actors?.join('，') ?? ''}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="releaseDate">发行日期</Label>
            <Input
              id="releaseDate"
              name="releaseDate"
              type="date"
              defaultValue={
                (draft?.releaseDate ?? values?.releaseDate)?.slice(0, 10) ?? ''
              }
            />
            <FieldError>{state.fieldErrors?.releaseDate}</FieldError>
          </div>

          <div>
            <Label htmlFor="score">评分（0–10）</Label>
            <Input
              id="score"
              name="score"
              type="number"
              step="0.1"
              min="0"
              max="10"
              defaultValue={draft?.score ?? values?.score ?? 8.5}
              required
            />
            <FieldError>{state.fieldErrors?.score}</FieldError>
          </div>

          <div>
            <Label htmlFor="slug">Slug（留空自动生成）</Label>
            <Input id="slug" name="slug" defaultValue={values?.slug} placeholder="自动生成" />
            <FieldError>{state.fieldErrors?.slug}</FieldError>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <ImageUploader
            name="coverImage"
            label="封面图"
            defaultValue={draft?.coverImage ?? values?.coverImage ?? ''}
          />
          <ImageUploader
            name="backgroundImage"
            label="背景图（可选）"
            defaultValue={draft?.backgroundImage ?? values?.backgroundImage ?? ''}
          />
        </section>

        {kind === 'review' && (
          <section className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="tracksText">曲目（每行一首）</Label>
              <Textarea
                id="tracksText"
                name="tracksText"
                rows={5}
                defaultValue={draft?.tracks ?? values?.tracks?.join('\n') ?? ''}
              />
            </div>
            <div>
              <Label htmlFor="mvUrl">MV 链接（可选）</Label>
              <Input id="mvUrl" name="mvUrl" defaultValue={v('mvUrl')} />
            </div>
          </section>
        )}

        <section>
          <Label>风格（可多选）</Label>
          <GenrePicker selected={genres} onChange={setGenres} />
        </section>

        <section>
          <Label htmlFor="excerpt">摘要（留空自动从正文提取）</Label>
          <Textarea
            id="excerpt"
            name="excerpt"
            rows={2}
            maxLength={300}
            defaultValue={v('excerpt')}
          />
        </section>

        <section>
          <Label>正文</Label>
          <RichEditor
            name="contentHtml"
            value={contentHtml}
            onChangeValue={setContentHtml}
            placeholder="开始写作…"
          />
          <FieldError>{state.fieldErrors?.contentHtml}</FieldError>
        </section>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-signal-border bg-black/95 py-4 backdrop-blur">
          <Button type="submit" disabled={pending} onClick={() => setStatus('PUBLISHED')}>
            {pending ? '保存中…' : '发布'}
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            onClick={() => setStatus('DRAFT')}
          >
            保存草稿
          </Button>
          {values?.id && (
            <span className="text-[0.66rem] text-signal-dim">正在编辑 #{values.id}</span>
          )}
          {state.error && <span className="text-xs text-red-400">{state.error}</span>}
        </div>
      </form>

      <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <AiAssist kind={kind} onDraft={applyDraft} />
        <div className="border border-signal-border p-4 text-xs leading-relaxed text-signal-dim">
          <p className="text-[0.62rem] uppercase tracking-[0.2em] text-signal-muted">提示</p>
          <ul className="mt-2 space-y-1.5">
            <li>· AI 只会填充表单，不会直接保存。</li>
            <li>· 正文会在服务端再次清洗，iframe 仅允许 YouTube / B 站。</li>
            <li>· 保存草稿不会出现在前台。</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

function GenrePicker({
  selected,
  onChange,
}: {
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const groups = useMemo(() => {
    const map = new Map<GenreGroup, typeof GENRES>()
    for (const genre of GENRES) {
      const list = map.get(genre.group) ?? []
      list.push(genre)
      map.set(genre.group, list)
    }
    return [...map.entries()]
  }, [])

  function toggle(name: string) {
    onChange(
      selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name],
    )
  }

  return (
    <div className="space-y-3 border border-signal-border p-3">
      {selected.map((name) => (
        <input key={name} type="hidden" name="genres" value={name} />
      ))}
      <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
        {groups.map(([group, items]) => (
          <div key={group}>
            <p className="mb-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-signal-dim">
              {GENRE_GROUP_LABELS[group]}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((genre) => {
                const active = selected.includes(genre.name)
                return (
                  <button
                    key={genre.slug}
                    type="button"
                    onClick={() => toggle(genre.name)}
                    className={
                      active
                        ? 'border border-white bg-white px-2 py-0.5 text-[0.66rem] text-black'
                        : 'border border-signal-border px-2 py-0.5 text-[0.66rem] text-signal-muted transition-colors hover:border-neutral-500 hover:text-white'
                    }
                  >
                    {genre.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
