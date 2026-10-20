import 'server-only'

import { revalidatePath, revalidateTag } from 'next/cache'

import { prisma } from '@/lib/prisma'
import { buildExcerpt, stripHtml } from '@/lib/legacy-content'
import { sanitizeForStorage } from '@/lib/sanitize'
import { findGenre, resolveGenreSlug } from '@/lib/genres'
import { uniqueSlug } from '@/lib/slug'
import type { AnimeFormInput, MovieFormInput, ReviewFormInput } from '@/lib/validation/content'
import { emptyToUndefined, parseDateField } from '@/lib/validation/content'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Resolve editor-supplied genre labels to rows.
 *
 * The catalogue in `lib/genres.ts` owns the canonical slug for each Chinese
 * label (e.g. 后摇 -> post-rock). Deriving a slug from the label would mint a
 * different slug for the same name and violate the unique constraint on
 * `genres.name`, so the catalogue is always consulted first.
 */
async function connectGenres(names: string[]): Promise<{ id: number }[]> {
  const ids: { id: number }[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name) continue

    const known = findGenre(name)
    const slug = known?.slug ?? resolveGenreSlug(name)
    const label = known?.name ?? name

    // Match on name first: an older import may have stored the same label
    // under a different slug.
    const existing = await prisma.genre.findUnique({
      where: { name: label },
      select: { id: true },
    })
    if (existing) {
      ids.push({ id: existing.id })
      continue
    }

    const genre = await prisma.genre.upsert({
      where: { slug },
      update: { name: label },
      create: { name: label, slug },
      select: { id: true },
    })
    ids.push({ id: genre.id })
  }
  return ids
}

async function takenSlugs(
  model: 'review' | 'anime' | 'movie',
  excludeId?: number,
): Promise<Set<string>> {
  const where = excludeId ? { id: { not: excludeId } } : undefined
  const rows =
    model === 'review'
      ? await prisma.review.findMany({ where, select: { slug: true } })
      : model === 'anime'
        ? await prisma.anime.findMany({ where, select: { slug: true } })
        : await prisma.movie.findMany({ where, select: { slug: true } })
  return new Set(rows.map((row) => row.slug))
}

function resolveSlug(input: {
  provided?: string
  fallback: string
  taken: Set<string>
  existingSlug?: string
}): string {
  const provided = input.provided?.trim()
  if (provided) {
    // Keep an explicit slug if the editor set one; make it unique.
    if (input.existingSlug === provided) return provided
    return uniqueSlug(provided, input.taken)
  }
  if (input.existingSlug) return input.existingSlug
  return uniqueSlug(input.fallback, input.taken)
}

/**
 * Slugs keep CJK characters, which are not valid in HTTP headers. Next writes
 * revalidation and redirect targets into headers, so every path must be
 * percent-encoded before it leaves the server.
 */
export function contentPath(base: string, slug: string): string {
  return `${base}/${encodeURIComponent(slug)}`
}

function revalidateContent(paths: string[], tags: string[]) {
  for (const tag of tags) revalidateTag(tag)
  for (const path of paths) revalidatePath(path)
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export async function saveReview(input: ReviewFormInput, authorId: number, id?: number) {
  const existing = id
    ? await prisma.review.findUnique({ where: { id }, select: { slug: true, albumId: true } })
    : null

  const taken = await takenSlugs('review', id)
  const slug = resolveSlug({
    provided: input.slug,
    fallback: `${input.artist} ${input.albumTitle}`,
    taken,
    existingSlug: existing?.slug,
  })

  const contentHtml = sanitizeForStorage(input.contentHtml)
  const excerpt = emptyToUndefined(input.excerpt) ?? buildExcerpt(contentHtml)
  const genres = await connectGenres(input.genres)
  const releaseDate = parseDateField(input.releaseDate)

  const album = await prisma.album.upsert({
    where: { artist_title: { artist: input.artist, title: input.albumTitle } },
    update: {
      releaseDate: releaseDate ?? undefined,
      label: emptyToUndefined(input.label),
      coverImage: emptyToUndefined(input.coverImage),
      genres: { set: genres },
    },
    create: {
      artist: input.artist,
      title: input.albumTitle,
      releaseDate,
      label: emptyToUndefined(input.label) ?? null,
      coverImage: emptyToUndefined(input.coverImage) ?? null,
      genres: { connect: genres },
    },
    select: { id: true },
  })

  const data = {
    slug,
    albumId: album.id,
    authorId,
    title: `${input.artist} - ${input.albumTitle}`,
    excerpt: excerpt.slice(0, 300),
    contentHtml,
    coverImage: emptyToUndefined(input.coverImage) ?? null,
    tracks: input.tracks,
    mvUrl: emptyToUndefined(input.mvUrl) ?? null,
    backgroundImage: emptyToUndefined(input.backgroundImage) ?? null,
    score: input.score,
    status: input.status,
    publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
  }

  const review = id
    ? await prisma.review.update({ where: { id }, data })
    : await prisma.review.create({ data })

  revalidateContent(
    ['/music', contentPath('/music', review.slug), '/', '/sitemap.xml'],
    ['reviews', `review:${review.id}`, 'home', 'sitemap'],
  )

  return review
}

export async function deleteReview(id: number) {
  const review = await prisma.review.findUnique({ where: { id }, select: { slug: true } })
  if (!review) return
  await prisma.review.delete({ where: { id } })
  revalidateContent(['/music', contentPath('/music', review.slug), '/', '/sitemap.xml'], ['reviews', 'home', 'sitemap'])
}

// ---------------------------------------------------------------------------
// Anime
// ---------------------------------------------------------------------------

export async function saveAnime(input: AnimeFormInput, authorId: number, id?: number) {
  const existing = id
    ? await prisma.anime.findUnique({ where: { id }, select: { slug: true } })
    : null
  const taken = await takenSlugs('anime', id)
  const slug = resolveSlug({
    provided: input.slug,
    fallback: input.title,
    taken,
    existingSlug: existing?.slug,
  })

  const contentHtml = sanitizeForStorage(input.contentHtml)
  const excerpt = emptyToUndefined(input.excerpt) ?? buildExcerpt(contentHtml)
  const genres = await connectGenres(input.genres)

  const data = {
    slug,
    authorId,
    title: input.title,
    excerpt: excerpt.slice(0, 300),
    contentHtml,
    coverImage: emptyToUndefined(input.coverImage) ?? null,
    backgroundImage: emptyToUndefined(input.backgroundImage) ?? null,
    score: input.score,
    studio: input.studio,
    releaseDate: parseDateField(input.releaseDate),
    status: input.status,
    publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
  }

  const anime = id
    ? await prisma.anime.update({ where: { id }, data: { ...data, genres: { set: genres } } })
    : await prisma.anime.create({ data: { ...data, genres: { connect: genres } } })

  revalidateContent(
    ['/anime', contentPath('/anime', anime.slug), '/', '/sitemap.xml'],
    ['anime', `anime:${anime.id}`, 'home', 'sitemap'],
  )

  return anime
}

export async function deleteAnime(id: number) {
  const anime = await prisma.anime.findUnique({ where: { id }, select: { slug: true } })
  if (!anime) return
  await prisma.anime.delete({ where: { id } })
  revalidateContent(['/anime', contentPath('/anime', anime.slug), '/', '/sitemap.xml'], ['anime', 'home', 'sitemap'])
}

// ---------------------------------------------------------------------------
// Movies
// ---------------------------------------------------------------------------

export async function saveMovie(input: MovieFormInput, authorId: number, id?: number) {
  const existing = id
    ? await prisma.movie.findUnique({ where: { id }, select: { slug: true } })
    : null
  const taken = await takenSlugs('movie', id)
  const slug = resolveSlug({
    provided: input.slug,
    fallback: input.title,
    taken,
    existingSlug: existing?.slug,
  })

  const contentHtml = sanitizeForStorage(input.contentHtml)
  const excerpt = emptyToUndefined(input.excerpt) ?? buildExcerpt(contentHtml)
  const genres = await connectGenres(input.genres)

  const data = {
    slug,
    authorId,
    title: input.title,
    excerpt: excerpt.slice(0, 300),
    contentHtml,
    coverImage: emptyToUndefined(input.coverImage) ?? null,
    backgroundImage: emptyToUndefined(input.backgroundImage) ?? null,
    score: input.score,
    director: input.director,
    actors: input.actors,
    region: emptyToUndefined(input.region) ?? null,
    releaseDate: parseDateField(input.releaseDate),
    status: input.status,
    publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
  }

  const movie = id
    ? await prisma.movie.update({ where: { id }, data: { ...data, genres: { set: genres } } })
    : await prisma.movie.create({ data: { ...data, genres: { connect: genres } } })

  revalidateContent(
    ['/movie', contentPath('/movie', movie.slug), '/', '/sitemap.xml'],
    ['movies', `movie:${movie.id}`, 'home', 'sitemap'],
  )

  return movie
}

export async function deleteMovie(id: number) {
  const movie = await prisma.movie.findUnique({ where: { id }, select: { slug: true } })
  if (!movie) return
  await prisma.movie.delete({ where: { id } })
  revalidateContent(['/movie', contentPath('/movie', movie.slug), '/', '/sitemap.xml'], ['movies', 'home', 'sitemap'])
}

// ---------------------------------------------------------------------------
// Admin list helpers
// ---------------------------------------------------------------------------

export async function listAdminReviews(keyword?: string) {
  const q = keyword?.trim()
  return prisma.review.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { album: { title: { contains: q, mode: 'insensitive' } } },
            { album: { artist: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : undefined,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      score: true,
      coverImage: true,
      publishedAt: true,
      updatedAt: true,
      album: { select: { title: true, artist: true, coverImage: true } },
    },
    orderBy: { id: 'desc' },
    take: 200,
  })
}

export async function listAdminAnime(keyword?: string) {
  const q = keyword?.trim()
  return prisma.anime.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { studio: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      score: true,
      coverImage: true,
      publishedAt: true,
      updatedAt: true,
      studio: true,
    },
    orderBy: { id: 'desc' },
    take: 200,
  })
}

export async function listAdminMovies(keyword?: string) {
  const q = keyword?.trim()
  return prisma.movie.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { director: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      score: true,
      coverImage: true,
      publishedAt: true,
      updatedAt: true,
      director: true,
    },
    orderBy: { id: 'desc' },
    take: 200,
  })
}

export async function getAdminReview(id: number) {
  return prisma.review.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      contentHtml: true,
      coverImage: true,
      backgroundImage: true,
      tracks: true,
      mvUrl: true,
      score: true,
      status: true,
      album: {
        select: {
          artist: true,
          title: true,
          releaseDate: true,
          label: true,
          genres: { select: { name: true } },
        },
      },
    },
  })
}

export async function getAdminAnime(id: number) {
  return prisma.anime.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      contentHtml: true,
      coverImage: true,
      backgroundImage: true,
      score: true,
      studio: true,
      releaseDate: true,
      status: true,
      genres: { select: { name: true } },
    },
  })
}

export async function getAdminMovie(id: number) {
  return prisma.movie.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      contentHtml: true,
      coverImage: true,
      backgroundImage: true,
      score: true,
      director: true,
      actors: true,
      region: true,
      releaseDate: true,
      status: true,
      genres: { select: { name: true } },
    },
  })
}

/** Used by the AI draft flow to preview plain text. */
export function plainText(html: string): string {
  return stripHtml(html)
}
