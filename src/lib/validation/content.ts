import { z } from 'zod'

const slugOrEmpty = z.string().trim().max(180).optional().or(z.literal(''))
const optionalDate = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, '日期格式应为 YYYY-MM-DD')
  .optional()
  .or(z.literal(''))

const baseFields = {
  title: z.string().trim().min(1, '标题不能为空').max(255),
  excerpt: z.string().trim().max(300).optional().or(z.literal('')),
  contentHtml: z.string().min(1, '正文不能为空').max(200_000),
  coverImage: z.string().trim().max(512).optional().or(z.literal('')),
  backgroundImage: z.string().trim().max(512).optional().or(z.literal('')),
  score: z.coerce.number().min(0, '评分不能小于 0').max(10, '评分不能大于 10'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  genres: z.array(z.string().trim().min(1)).max(12).default([]),
}

export const reviewFormSchema = z.object({
  ...baseFields,
  slug: slugOrEmpty,
  artist: z.string().trim().min(1, '艺人不能为空').max(128),
  albumTitle: z.string().trim().min(1, '专辑名不能为空').max(128),
  releaseDate: optionalDate,
  label: z.string().trim().max(128).optional().or(z.literal('')),
  tracks: z.array(z.string().trim().min(1)).max(100).default([]),
  mvUrl: z.string().trim().max(512).optional().or(z.literal('')),
})

export const animeFormSchema = z.object({
  ...baseFields,
  slug: slugOrEmpty,
  studio: z.string().trim().min(1, '制作公司不能为空').max(128),
  releaseDate: optionalDate,
})

export const movieFormSchema = z.object({
  ...baseFields,
  slug: slugOrEmpty,
  director: z.string().trim().min(1, '导演不能为空').max(128),
  actors: z.array(z.string().trim().min(1)).max(50).default([]),
  region: z.string().trim().max(64).optional().or(z.literal('')),
  releaseDate: optionalDate,
})

export type ReviewFormInput = z.infer<typeof reviewFormSchema>
export type AnimeFormInput = z.infer<typeof animeFormSchema>
export type MovieFormInput = z.infer<typeof movieFormSchema>

/** Convert an empty string to undefined so optional columns stay null. */
export function emptyToUndefined(value: string | undefined | null): string | undefined {
  return value && value.trim() ? value.trim() : undefined
}

/** Parse a `YYYY-MM-DD` field into a UTC date. */
export function parseDateField(value: string | undefined | null): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}
