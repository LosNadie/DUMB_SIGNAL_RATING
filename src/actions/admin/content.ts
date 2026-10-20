'use server'

import { redirect } from 'next/navigation'

import { requireEditor } from '@/lib/auth/session'
import {
  animeFormSchema,
  movieFormSchema,
  reviewFormSchema,
} from '@/lib/validation/content'
import {
  deleteAnime,
  deleteMovie,
  deleteReview,
  saveAnime,
  saveMovie,
  saveReview,
} from '@/server/content-service'

export interface ContentActionState {
  error?: string
  fieldErrors?: Record<string, string>
}

function flatten(issues: readonly { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form')
    if (!result[key]) result[key] = issue.message
  }
  return result
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function list(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
}

function commaList(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split(/[,，\n]/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export async function saveReviewAction(
  _previous: ContentActionState | undefined,
  formData: FormData,
): Promise<ContentActionState> {
  const user = await requireEditor()
  const id = Number(formData.get('id')) || undefined

  const parsed = reviewFormSchema.safeParse({
    slug: text(formData, 'slug'),
    title: text(formData, 'title') || `${text(formData, 'artist')} - ${text(formData, 'albumTitle')}`,
    artist: text(formData, 'artist'),
    albumTitle: text(formData, 'albumTitle'),
    excerpt: text(formData, 'excerpt'),
    contentHtml: text(formData, 'contentHtml'),
    coverImage: text(formData, 'coverImage'),
    backgroundImage: text(formData, 'backgroundImage'),
    score: text(formData, 'score'),
    status: text(formData, 'status') || 'DRAFT',
    releaseDate: text(formData, 'releaseDate'),
    label: text(formData, 'label'),
    tracks: commaList(formData, 'tracksText'),
    mvUrl: text(formData, 'mvUrl'),
    genres: list(formData, 'genres'),
  })

  if (!parsed.success) return { fieldErrors: flatten(parsed.error.issues) }

  try {
    const review = await saveReview(parsed.data, user.userId, id)
    redirect(`/admin/reviews/${review.id}?saved=1`)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { error: error instanceof Error ? error.message : '保存失败' }
  }
}

export async function saveAnimeAction(
  _previous: ContentActionState | undefined,
  formData: FormData,
): Promise<ContentActionState> {
  const user = await requireEditor()
  const id = Number(formData.get('id')) || undefined

  const parsed = animeFormSchema.safeParse({
    slug: text(formData, 'slug'),
    title: text(formData, 'title'),
    excerpt: text(formData, 'excerpt'),
    contentHtml: text(formData, 'contentHtml'),
    coverImage: text(formData, 'coverImage'),
    backgroundImage: text(formData, 'backgroundImage'),
    score: text(formData, 'score'),
    status: text(formData, 'status') || 'DRAFT',
    studio: text(formData, 'studio'),
    releaseDate: text(formData, 'releaseDate'),
    genres: list(formData, 'genres'),
  })

  if (!parsed.success) return { fieldErrors: flatten(parsed.error.issues) }

  try {
    const anime = await saveAnime(parsed.data, user.userId, id)
    redirect(`/admin/anime/${anime.id}?saved=1`)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { error: error instanceof Error ? error.message : '保存失败' }
  }
}

export async function saveMovieAction(
  _previous: ContentActionState | undefined,
  formData: FormData,
): Promise<ContentActionState> {
  const user = await requireEditor()
  const id = Number(formData.get('id')) || undefined

  const parsed = movieFormSchema.safeParse({
    slug: text(formData, 'slug'),
    title: text(formData, 'title'),
    excerpt: text(formData, 'excerpt'),
    contentHtml: text(formData, 'contentHtml'),
    coverImage: text(formData, 'coverImage'),
    backgroundImage: text(formData, 'backgroundImage'),
    score: text(formData, 'score'),
    status: text(formData, 'status') || 'DRAFT',
    director: text(formData, 'director'),
    actors: commaList(formData, 'actorsText'),
    region: text(formData, 'region'),
    releaseDate: text(formData, 'releaseDate'),
    genres: list(formData, 'genres'),
  })

  if (!parsed.success) return { fieldErrors: flatten(parsed.error.issues) }

  try {
    const movie = await saveMovie(parsed.data, user.userId, id)
    redirect(`/admin/movies/${movie.id}?saved=1`)
  } catch (error) {
    if (isRedirect(error)) throw error
    return { error: error instanceof Error ? error.message : '保存失败' }
  }
}

export async function deleteContentAction(formData: FormData): Promise<void> {
  await requireEditor()
  const type = text(formData, 'type')
  const id = Number(formData.get('id'))
  if (!Number.isInteger(id) || id <= 0) return

  if (type === 'review') await deleteReview(id)
  else if (type === 'anime') await deleteAnime(id)
  else if (type === 'movie') await deleteMovie(id)

  redirect(`/admin/${type === 'review' ? 'reviews' : type === 'anime' ? 'anime' : 'movies'}`)
}

function isRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}
