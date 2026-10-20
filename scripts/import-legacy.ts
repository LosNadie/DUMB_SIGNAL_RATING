/**
 * Import a legacy MySQL snapshot into the new PostgreSQL schema.
 *
 *   pnpm legacy:export                       # MySQL -> legacy-export/snapshot-*.json
 *   pnpm legacy:import --dry-run             # validate + report, write nothing
 *   pnpm legacy:import                       # import
 *   pnpm legacy:import --only=reviews
 *   pnpm legacy:import --limit=10
 *
 * Design notes:
 * - Idempotent: users are keyed by username, albums by (artist, title),
 *   content by slug (which embeds the legacy id).
 * - Never deletes anything. Re-running updates the rows it owns.
 * - Media files are copied from the legacy uploads directory into UPLOAD_DIR
 *   unless --skip-media is passed.
 */

import { copyFile, mkdir, readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { PrismaClient, type ContentStatus, type Role, type UserStatus } from '@prisma/client'

import { buildExcerpt, parseLegacyReviewContent, parseLegacyTitle, parsePeopleList } from '../src/lib/legacy-content'
import { parseGenreList, resolveGenreSlug, findGenre, GENRES } from '../src/lib/genres'
import { uniqueSlug } from '../src/lib/slug'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Options {
  dryRun: boolean
  limit: number | null
  only: Set<'users' | 'reviews' | 'anime' | 'movies' | 'comments'>
  skipMedia: boolean
  snapshot: string
  legacyUploads: string
}

const ALL_SECTIONS = ['users', 'reviews', 'anime', 'movies', 'comments'] as const

function parseArgs(argv: string[]): Options {
  const options: Options = {
    dryRun: false,
    limit: null,
    only: new Set(ALL_SECTIONS),
    skipMedia: false,
    snapshot: '',
    legacyUploads: path.resolve('dumb-backend/uploads'),
  }

  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--skip-media') options.skipMedia = true
    else if (arg.startsWith('--limit=')) options.limit = Number(arg.split('=')[1]) || null
    else if (arg.startsWith('--snapshot=')) options.snapshot = arg.split('=')[1]
    else if (arg.startsWith('--legacy-uploads=')) options.legacyUploads = path.resolve(arg.split('=')[1])
    else if (arg.startsWith('--only=')) {
      const requested = arg
        .split('=')[1]
        .split(',')
        .map((value) => value.trim())
      const normalised = new Set<'users' | 'reviews' | 'anime' | 'movies' | 'comments'>()
      for (const value of requested) {
        if (value === 'reviews' || value === 'review') normalised.add('reviews')
        else if (value === 'anime') normalised.add('anime')
        else if (value === 'movies' || value === 'movie') normalised.add('movies')
        else if (value === 'comments' || value === 'comment') normalised.add('comments')
        else if (value === 'users' || value === 'user') normalised.add('users')
        else throw new Error(`Unknown --only value: ${value}`)
      }
      options.only = normalised
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: tsx scripts/import-legacy.ts [options]',
          '  --dry-run             validate and report without writing',
          '  --only=a,b            users,reviews,anime,movies,comments',
          '  --limit=N             only process the first N rows per section',
          '  --snapshot=path       snapshot JSON (default: newest in legacy-export/)',
          '  --legacy-uploads=dir  source uploads directory',
          '  --skip-media          do not copy upload files',
        ].join('\n'),
      )
      process.exit(0)
    }
  }

  return options
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

class Report {
  private readonly warnings: string[] = []
  readonly counts: Record<string, number> = {}

  bump(key: string, amount = 1) {
    this.counts[key] = (this.counts[key] ?? 0) + amount
  }

  warn(message: string) {
    this.warnings.push(message)
  }

  print() {
    console.log('\n=== Import report ===')
    for (const [key, value] of Object.entries(this.counts).sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`  ${key.padEnd(38)} ${value}`)
    }
    if (this.warnings.length) {
      console.log(`\n  warnings (${this.warnings.length}):`)
      for (const warning of this.warnings.slice(0, 40)) console.log(`    - ${warning}`)
      if (this.warnings.length > 40) console.log(`    … and ${this.warnings.length - 40} more`)
    }
  }
}

// ---------------------------------------------------------------------------
// Snapshot loading
// ---------------------------------------------------------------------------

interface Snapshot {
  tables: Record<string, Record<string, unknown>[]>
}

async function resolveSnapshot(explicit?: string): Promise<string> {
  if (explicit) return path.resolve(explicit)
  const dir = path.resolve('legacy-export')
  if (!existsSync(dir)) throw new Error('legacy-export/ not found — run `pnpm legacy:export` first')
  const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort()
  if (!files.length) throw new Error('No snapshot JSON found in legacy-export/')
  return path.join(dir, files[files.length - 1])
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function num(value: unknown): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function date(value: unknown): Date | null {
  const raw = str(value)
  if (!raw) return null
  // MySQL DATETIME strings are local time; interpret them as such.
  const parsed = new Date(raw.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function yearDate(year: number | null): Date | null {
  if (!year) return null
  return new Date(Date.UTC(year, 0, 1))
}

// ---------------------------------------------------------------------------
// Genre resolution
// ---------------------------------------------------------------------------

class GenreResolver {
  private readonly bySlug = new Map<string, { id: number; name: string; slug: string }>()
  readonly created: string[] = []
  private readonly pending = new Set<string>()

  constructor(existing: { id: number; name: string; slug: string }[]) {
    for (const genre of existing) this.bySlug.set(genre.slug, genre)
  }

  async resolve(label: string): Promise<{ id: number; name: string; slug: string } | null> {
    const trimmed = label.trim()
    if (!trimmed) return null

    const known = findGenre(trimmed)
    const slug = resolveGenreSlug(trimmed)
    const existing = this.bySlug.get(slug)
    if (existing) return existing

    const name = known?.name ?? trimmed
    if (this.pending.has(slug)) return null // created earlier in this run
    this.pending.add(slug)

    const created = await prisma.genre.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
      select: { id: true, name: true, slug: true },
    })
    this.bySlug.set(slug, created)
    this.created.push(`${name} (${slug})`)
    return created
  }

  async connectMany(labels: string[]) {
    const ids: { id: number }[] = []
    for (const label of labels) {
      const genre = await this.resolve(label)
      if (genre) ids.push({ id: genre.id })
    }
    return ids
  }
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

class MediaCopier {
  private readonly copied = new Set<string>()

  constructor(
    private readonly sourceDir: string,
    private readonly targetDir: string,
    private readonly skip: boolean,
    private readonly report: Report,
  ) {}

  /** Normalise a legacy media reference to `/uploads/<file>`. */
  normalise(value: string | null | undefined): string | null {
    if (!value) return null
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    const filename = trimmed.replace(/^.*[\\/]/, '')
    if (!filename) return null
    return `/uploads/${filename}`
  }

  async copyIfNeeded(reference: string | null) {
    if (!reference || this.skipMedia) return
    if (!reference.startsWith('/uploads/')) return
    if (this.copied.has(reference)) return
    this.copied.add(reference)

    const filename = reference.slice('/uploads/'.length)
    const source = path.join(this.sourceDir, filename)
    const target = path.join(this.targetDir, filename)

    if (!existsSync(source)) {
      this.report.warn(`missing media file: ${filename}`)
      this.report.bump('media.missing')
      return
    }
    if (existsSync(target)) {
      this.report.bump('media.already_present')
      return
    }
    await mkdir(path.dirname(target), { recursive: true })
    await copyFile(source, target)
    this.report.bump('media.copied')
  }
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const snapshotPath = await resolveSnapshot(options.snapshot)
  console.log(`Snapshot: ${snapshotPath}`)
  if (options.dryRun) console.log('DRY RUN — nothing will be written to PostgreSQL\n')

  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot
  const tables = snapshot.tables
  const report = new Report()

  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? 'public/uploads')
  const media = new MediaCopier(options.legacyUploads, uploadDir, options.skipMedia, report)
  if (!existsSync(options.legacyUploads) && !options.skipMedia) {
    report.warn(`legacy uploads directory not found: ${options.legacyUploads}`)
  }

  // -- seed the catalogue so slugs stay stable -------------------------------
  if (!options.dryRun) {
    for (const genre of GENRES) {
      await prisma.genre.upsert({
        where: { slug: genre.slug },
        update: {},
        create: { name: genre.name, slug: genre.slug },
      })
    }
  }
  const existingGenres = options.dryRun
    ? []
    : await prisma.genre.findMany({ select: { id: true, name: true, slug: true } })
  const genres = new GenreResolver(existingGenres)

  // -- users -----------------------------------------------------------------
  const userIdMap = new Map<number, number>()

  if (options.only.has('users')) {
    console.log('Importing users…')
    for (const row of tables.user ?? []) {
      const legacyId = num(row.id)
      const username = str(row.username).trim()
      const email = str(row.email).trim()
      if (!legacyId || !username || !email) {
        report.warn(`user ${legacyId}: missing username/email, skipped`)
        continue
      }

      const role = (['ADMIN', 'EDITOR', 'USER'].includes(str(row.role)) ? str(row.role) : 'USER') as Role
      const status = (str(row.status) === 'DISABLED' ? 'DISABLED' : 'ENABLED') as UserStatus
      const data = {
        username,
        email,
        passwordHash: str(row.password),
        avatar: str(row.avatar) || null,
        role,
        status,
      }

      if (options.dryRun) {
        report.bump('users.would_import')
        continue
      }

      // Seed accounts (created by `pnpm db:seed`) keep their known password;
      // legacy hashes cannot be reversed, so only fill them in for new users.
      const user = await prisma.user.upsert({
        where: { username },
        update: { email, avatar: data.avatar, role, status },
        create: data,
        select: { id: true },
      })
      userIdMap.set(legacyId, user.id)
      report.bump('users.imported')
    }
  }

  if (!options.dryRun && options.only.has('users')) {
    const users = await prisma.user.findMany({ select: { id: true, username: true } })
    // Map legacy ids for users imported in earlier runs too.
    for (const row of tables.user ?? []) {
      const legacyId = num(row.id)
      const match = users.find((user) => user.username === str(row.username))
      if (legacyId && match) userIdMap.set(legacyId, match.id)
    }
  } else if (options.dryRun) {
    // Dry-run still needs the map to validate references.
    for (const row of tables.user ?? []) {
      const legacyId = num(row.id)
      if (legacyId) userIdMap.set(legacyId, legacyId)
    }
  }

  const fallbackAuthor = await resolveFallbackAuthor(userIdMap)
  if (!fallbackAuthor) {
    console.warn(
      '! No admin user exists yet — content without a valid author will be attributed to the seed admin.\n' +
        '  Run `pnpm db:seed` before importing to create it.',
    )
  }

  // -- albums + reviews ------------------------------------------------------
  const reviewIdMap = new Map<number, number>()
  const albumIdMap = new Map<number, number>()

  if (options.only.has('reviews')) {
    console.log('Importing albums and reviews…')
    const albumRows = tables.album ?? []
    const reviewRows = (tables.review ?? []).slice(0, options.limit ?? undefined)
    const albumById = new Map(albumRows.map((row) => [num(row.id), row]))

    const takenReviewSlugs = new Set<string>()
    const takenAlbumKeys = new Set<string>()
    if (!options.dryRun) {
      const [slugs, albums] = await Promise.all([
        prisma.review.findMany({ select: { slug: true } }),
        prisma.album.findMany({ select: { artist: true, title: true } }),
      ])
      for (const row of slugs) takenReviewSlugs.add(row.slug)
      for (const row of albums) takenAlbumKeys.add(`${row.artist}||${row.title}`)
    }

    for (const row of reviewRows) {
      const legacyId = num(row.id)
      if (!legacyId) continue

      const parsed = parseLegacyReviewContent(str(row.content))
      const albumRow = albumById.get(num(row.album_id))

      // Album identity: prefer the linked album row, fall back to the title.
      const fromTitle = parseLegacyTitle(str(row.title))
      const artist = str(albumRow?.artist).trim() || fromTitle.artist
      const albumTitle = str(albumRow?.title).trim() || fromTitle.albumTitle

      if (!artist || !albumTitle) {
        report.warn(`review ${legacyId}: cannot resolve artist/album, skipped`)
        report.bump('reviews.skipped')
        continue
      }

      const genreLabels = parseGenreList(str(albumRow?.genre))
      if (!genreLabels.length) genreLabels.push(...parsed.genres)
      if (!genreLabels.length) {
        report.warn(`review ${legacyId}: no genre, defaulting to 其他`)
        genreLabels.push('其他')
      }

      const releaseDate = date(albumRow?.release_date) ?? yearDate(parsed.year)
      const coverImage =
        media.normalise(str(row.cover_image)) ?? media.normalise(str(albumRow?.cover_image))
      const backgroundImage = media.normalise(parsed.backgroundImage)

      await media.copyIfNeeded(coverImage)
      await media.copyIfNeeded(backgroundImage)

      const albumKey = `${artist}||${albumTitle}`
      if (takenAlbumKeys.has(albumKey)) report.bump('albums.matched_existing')
      takenAlbumKeys.add(albumKey)

      const slug = uniqueSlug(`${artist} ${albumTitle}`, takenReviewSlugs, legacyId)

      if (options.dryRun) {
        report.bump('reviews.would_import')
        reviewIdMap.set(legacyId, legacyId)
        albumIdMap.set(num(row.album_id) ?? legacyId, num(row.album_id) ?? legacyId)
        continue
      }

      const authorLegacyId = num(row.author_id)
      const authorId = (authorLegacyId && userIdMap.get(authorLegacyId)) ?? fallbackAuthor
      if (!authorId) {
        report.warn(`review ${legacyId}: no author available, skipped`)
        report.bump('reviews.skipped')
        continue
      }
      if (!authorLegacyId || !userIdMap.get(authorLegacyId)) {
        report.warn(`review ${legacyId}: author ${authorLegacyId ?? '?'} missing, attributed to fallback`)
        report.bump('reviews.author_fallback')
      }

      const genreConnections = await genres.connectMany(genreLabels)

      const album = await prisma.album.upsert({
        where: { artist_title: { artist, title: albumTitle } },
        update: {
          coverImage: coverImage ?? undefined,
          releaseDate: releaseDate ?? undefined,
          label: str(albumRow?.label_name) || undefined,
          description: str(albumRow?.description) || undefined,
          genres: { set: genreConnections },
        },
        create: {
          artist,
          title: albumTitle,
          coverImage,
          releaseDate,
          label: str(albumRow?.label_name) || null,
          description: str(albumRow?.description) || null,
          genres: { connect: genreConnections },
        },
        select: { id: true },
      })
      albumIdMap.set(num(row.album_id) ?? legacyId, album.id)

      const review = await prisma.review.upsert({
        where: { slug },
        update: {
          albumId: album.id,
          authorId,
          title: str(row.title),
          excerpt: buildExcerpt(parsed.contentHtml),
          contentHtml: parsed.contentHtml,
          coverImage,
          tracks: parsed.tracks,
          mvUrl: parsed.mvUrl,
          backgroundImage,
          score: Number(num(row.score) ?? 0),
          status: normaliseStatus(row.status),
          publishedAt: date(row.publish_time),
        },
        create: {
          slug,
          albumId: album.id,
          authorId,
          title: str(row.title),
          excerpt: buildExcerpt(parsed.contentHtml),
          contentHtml: parsed.contentHtml,
          coverImage,
          tracks: parsed.tracks,
          mvUrl: parsed.mvUrl,
          backgroundImage,
          score: Number(num(row.score) ?? 0),
          status: normaliseStatus(row.status),
          publishedAt: date(row.publish_time),
          createdAt: date(row.create_time) ?? undefined,
          updatedAt: date(row.update_time) ?? undefined,
        },
        select: { id: true },
      })
      reviewIdMap.set(legacyId, review.id)
      report.bump('reviews.imported')
    }
  } else {
    await mapExistingReviewIds(reviewIdMap)
  }

  // -- anime -----------------------------------------------------------------
  const animeIdMap = new Map<number, number>()

  if (options.only.has('anime')) {
    console.log('Importing anime…')
    const rows = (tables.anime ?? []).slice(0, options.limit ?? undefined)
    const taken = await takenSlugs('anime')

    for (const row of rows) {
      const legacyId = num(row.id)
      if (!legacyId) continue

      const title = str(row.title).trim()
      if (!title) {
        report.warn(`anime ${legacyId}: empty title, skipped`)
        continue
      }

      const contentHtml = str(row.content)
      const coverImage = media.normalise(str(row.cover_image))
      const backgroundImage = media.normalise(str(row.background_image))
      await media.copyIfNeeded(coverImage)
      await media.copyIfNeeded(backgroundImage)

      const slug = uniqueSlug(title, taken, legacyId)
      const genreLabels = parseGenreList(str(row.genre))
      const authorLegacyId = num(row.author_id)

      if (options.dryRun) {
        report.bump('anime.would_import')
        animeIdMap.set(legacyId, legacyId)
        continue
      }

      const authorId = (authorLegacyId && userIdMap.get(authorLegacyId)) ?? fallbackAuthor
      if (!authorId) {
        report.warn(`anime ${legacyId}: no author available, skipped`)
        continue
      }
      const genreConnections = await genres.connectMany(genreLabels)

      const data = {
        slug,
        authorId,
        title,
        excerpt: buildExcerpt(contentHtml),
        contentHtml,
        coverImage,
        backgroundImage,
        score: Number(num(row.score) ?? 0),
        studio: str(row.studio) || '未知',
        releaseDate: date(row.release_date),
        views: num(row.views) ?? 0,
        status: normaliseStatus(row.status),
        publishedAt: date(row.publish_time),
      }

      const anime = await prisma.anime.upsert({
        where: { slug },
        update: { ...data, genres: { set: genreConnections } },
        create: { ...data, genres: { connect: genreConnections }, createdAt: date(row.create_time) ?? undefined },
        select: { id: true },
      })
      animeIdMap.set(legacyId, anime.id)
      report.bump('anime.imported')
    }
  } else {
    await mapExistingIds('anime', animeIdMap)
  }

  // -- movies ----------------------------------------------------------------
  const movieIdMap = new Map<number, number>()

  if (options.only.has('movies')) {
    console.log('Importing movies…')
    const rows = (tables.movie ?? []).slice(0, options.limit ?? undefined)
    const taken = await takenSlugs('movie')

    for (const row of rows) {
      const legacyId = num(row.id)
      if (!legacyId) continue

      const title = str(row.title).trim()
      if (!title) {
        report.warn(`movie ${legacyId}: empty title, skipped`)
        continue
      }

      const contentHtml = str(row.content)
      const coverImage = media.normalise(str(row.cover_image))
      const backgroundImage = media.normalise(str(row.background_image))
      await media.copyIfNeeded(coverImage)
      await media.copyIfNeeded(backgroundImage)

      const slug = uniqueSlug(title, taken, legacyId)
      const genreLabels = parseGenreList(str(row.genre))
      const authorLegacyId = num(row.author_id)

      if (options.dryRun) {
        report.bump('movies.would_import')
        movieIdMap.set(legacyId, legacyId)
        continue
      }

      const authorId = (authorLegacyId && userIdMap.get(authorLegacyId)) ?? fallbackAuthor
      if (!authorId) {
        report.warn(`movie ${legacyId}: no author available, skipped`)
        continue
      }
      const genreConnections = await genres.connectMany(genreLabels)

      const data = {
        slug,
        authorId,
        title,
        excerpt: buildExcerpt(contentHtml),
        contentHtml,
        coverImage,
        backgroundImage,
        score: Number(num(row.score) ?? 0),
        director: str(row.director) || '未知',
        actors: parsePeopleList(str(row.actors)),
        region: str(row.region) || null,
        releaseDate: date(row.release_date),
        views: num(row.views) ?? 0,
        status: normaliseStatus(row.status),
        publishedAt: date(row.publish_time),
      }

      const movie = await prisma.movie.upsert({
        where: { slug },
        update: { ...data, genres: { set: genreConnections } },
        create: { ...data, genres: { connect: genreConnections }, createdAt: date(row.create_time) ?? undefined },
        select: { id: true },
      })
      movieIdMap.set(legacyId, movie.id)
      report.bump('movies.imported')
    }
  } else {
    await mapExistingIds('movie', movieIdMap)
  }

  // -- comments --------------------------------------------------------------
  if (options.only.has('comments')) {
    console.log('Importing comments…')
    const rows = (tables.comment ?? []).slice(0, options.limit ?? undefined)
    const parentIdMap = new Map<number, number>()
    const validReviewIds = await existingIds('review')
    const validAnimeIds = await existingIds('anime')
    const validMovieIds = await existingIds('movie')

    for (const row of rows) {
      const legacyId = num(row.id)
      if (!legacyId) continue

      const contentType = str(row.content_type).toUpperCase()
      const legacyTarget = num(row.content_id)
      const userLegacyId = num(row.user_id)
      const content = str(row.content).trim()
      if (!legacyTarget || !content) {
        report.warn(`comment ${legacyId}: empty target/content, skipped`)
        continue
      }

      const targetId =
        contentType === 'REVIEW'
          ? reviewIdMap.get(legacyTarget)
          : contentType === 'ANIME'
            ? animeIdMap.get(legacyTarget)
            : contentType === 'MOVIE'
              ? movieIdMap.get(legacyTarget)
              : undefined

      if (!targetId) {
        report.warn(`comment ${legacyId}: orphan (${contentType} #${legacyTarget}), skipped`)
        report.bump('comments.orphan')
        continue
      }
      if (
        (contentType === 'REVIEW' && !validReviewIds.has(targetId)) ||
        (contentType === 'ANIME' && !validAnimeIds.has(targetId)) ||
        (contentType === 'MOVIE' && !validMovieIds.has(targetId))
      ) {
        report.warn(`comment ${legacyId}: target ${contentType} #${targetId} not present, skipped`)
        report.bump('comments.orphan')
        continue
      }

      const userId = (userLegacyId && userIdMap.get(userLegacyId)) ?? null
      if (!userId) {
        report.warn(`comment ${legacyId}: user ${userLegacyId ?? '?'} missing, skipped`)
        report.bump('comments.skipped')
        continue
      }

      if (options.dryRun) {
        report.bump('comments.would_import')
        continue
      }

      const parentLegacyId = num(row.parent_id)
      const parentId = parentLegacyId ? (parentIdMap.get(parentLegacyId) ?? null) : null

      const comment = await prisma.comment.create({
        data: {
          userId,
          content,
          parentId,
          reviewId: contentType === 'REVIEW' ? targetId : null,
          animeId: contentType === 'ANIME' ? targetId : null,
          movieId: contentType === 'MOVIE' ? targetId : null,
          createdAt: date(row.create_time) ?? undefined,
        },
        select: { id: true },
      })
      parentIdMap.set(legacyId, comment.id)
      report.bump('comments.imported')
    }
  }

  report.print()

  if (genres.created.length) {
    console.log(`\nNew genres created (${genres.created.length}): ${genres.created.join(', ')}`)
  }

  if (options.dryRun) {
    console.log('\nDry run complete. Re-run without --dry-run to write to PostgreSQL.')
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseStatus(value: unknown): ContentStatus {
  const raw = str(value).toUpperCase()
  if (raw === 'PUBLISHED') return 'PUBLISHED'
  if (raw === 'ARCHIVED') return 'ARCHIVED'
  return 'DRAFT'
}

async function resolveFallbackAuthor(userIdMap: Map<number, number>): Promise<number | null> {
  if (!userIdMap.size) {
    const admin = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'EDITOR'] } },
      orderBy: { id: 'asc' },
      select: { id: true },
    })
    return admin?.id ?? null
  }
  const first = userIdMap.values().next().value
  return first ?? null
}

async function takenSlugs(model: 'anime' | 'movie'): Promise<Set<string>> {
  const rows =
    model === 'anime'
      ? await prisma.anime.findMany({ select: { slug: true } })
      : await prisma.movie.findMany({ select: { slug: true } })
  return new Set(rows.map((row) => row.slug))
}

async function existingIds(model: 'review' | 'anime' | 'movie'): Promise<Set<number>> {
  const rows =
    model === 'review'
      ? await prisma.review.findMany({ select: { id: true } })
      : model === 'anime'
        ? await prisma.anime.findMany({ select: { id: true } })
        : await prisma.movie.findMany({ select: { id: true } })
  return new Set(rows.map((row) => row.id))
}

async function mapExistingIds(model: 'anime' | 'movie', target: Map<number, number>) {
  const snapshot = JSON.parse(
    await readFile(await resolveSnapshot(process.env.LEGACY_SNAPSHOT), 'utf8'),
  ) as Snapshot
  const rows = snapshot.tables[model] ?? []
  for (const row of rows) {
    const legacyId = num(row.id)
    const title = str(row.title).trim()
    if (!legacyId || !title) continue
    const match =
      model === 'anime'
        ? await prisma.anime.findFirst({ where: { title }, select: { id: true } })
        : await prisma.movie.findFirst({ where: { title }, select: { id: true } })
    if (match) target.set(legacyId, match.id)
  }
}

async function mapExistingReviewIds(target: Map<number, number>) {
  const snapshot = JSON.parse(
    await readFile(await resolveSnapshot(process.env.LEGACY_SNAPSHOT), 'utf8'),
  ) as Snapshot
  for (const row of snapshot.tables.review ?? []) {
    const legacyId = num(row.id)
    if (!legacyId) continue
    const slugSuffix = `-${legacyId}`
    const match = await prisma.review.findFirst({
      where: { slug: { endsWith: slugSuffix } },
      select: { id: true },
    })
    if (match) target.set(legacyId, match.id)
  }
}

main()
  .catch((error) => {
    console.error('\nImport failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
