/**
 * Post-migration sanity check: compares the legacy snapshot with PostgreSQL.
 * Usage: tsx scripts/verify-migration.ts [snapshot.json]
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Snapshot {
  tables: Record<string, Record<string, unknown>[]>
}

function resolveSnapshot(explicit?: string): string {
  if (explicit) return path.resolve(explicit)
  const dir = path.resolve('legacy-export')
  const files = existsSync(dir)
    ? readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    : []
  if (!files.length) throw new Error('no snapshot found in legacy-export/')
  return path.join(dir, files[files.length - 1])
}

async function main() {
  const snapshot = JSON.parse(readFileSync(resolveSnapshot(process.argv[2]), 'utf8')) as Snapshot
  const t = snapshot.tables

  const legacyReviewIds = new Set(t.review.map((r) => Number(r.id)))
  const legacyAnimeIds = new Set(t.anime.map((r) => Number(r.id)))
  const legacyMovieIds = new Set(t.movie.map((r) => Number(r.id)))

  const [reviews, anime, movies, comments, users, albums] = await Promise.all([
    prisma.review.count(),
    prisma.anime.count(),
    prisma.movie.count(),
    prisma.comment.count(),
    prisma.user.count(),
    prisma.album.count(),
  ])

  // Every imported row keeps its legacy id as a slug suffix.
  const reviewSlugs = await prisma.review.findMany({ select: { slug: true } })
  const importedReviews = reviewSlugs.filter((r) => /-\d+$/.test(r.slug)).length
  const animeSlugs = await prisma.anime.findMany({ select: { slug: true } })
  const importedAnime = animeSlugs.filter((r) => /-\d+$/.test(r.slug)).length
  const movieSlugs = await prisma.movie.findMany({ select: { slug: true } })
  const importedMovies = movieSlugs.filter((r) => /-\d+$/.test(r.slug)).length

  const orphanComments = t.comment.filter((c) => {
    const type = String(c.content_type).toUpperCase()
    const id = Number(c.content_id)
    if (type === 'REVIEW') return !legacyReviewIds.has(id)
    if (type === 'ANIME') return !legacyAnimeIds.has(id)
    if (type === 'MOVIE') return !legacyMovieIds.has(id)
    return true
  }).length

  const missingTracks = await prisma.review.count({ where: { tracks: { isEmpty: true } } })
  const missingGenres = await prisma.album.count({ where: { genres: { none: {} } } })
  const missingCover = await prisma.review.count({ where: { coverImage: null } })
  const missingBg = await prisma.review.count({ where: { backgroundImage: null } })

  console.log('=== Migration verification ===')
  console.log(`users            legacy ${t.user.length}  ->  postgres ${users}`)
  console.log(`albums           legacy ${t.album.length} (deduped)  ->  postgres ${albums}`)
  console.log(`reviews          legacy ${t.review.length}  ->  postgres ${reviews} (imported ${importedReviews})`)
  console.log(`anime            legacy ${t.anime.length}  ->  postgres ${anime} (imported ${importedAnime})`)
  console.log(`movies           legacy ${t.movie.length}  ->  postgres ${movies} (imported ${importedMovies})`)
  console.log(`comments         legacy ${t.comment.length}  ->  postgres ${comments} (orphans skipped ${orphanComments})`)
  console.log('')
  console.log(`reviews without tracks     ${missingTracks}`)
  console.log(`albums without genres      ${missingGenres}`)
  console.log(`reviews without cover      ${missingCover}`)
  console.log(`reviews without background ${missingBg}`)

  const problems: string[] = []
  if (importedReviews < t.review.length) problems.push('some reviews were not imported')
  if (importedAnime < t.anime.length) problems.push('some anime were not imported')
  if (importedMovies < t.movie.length) problems.push('some movies were not imported')
  if (missingTracks > 0) problems.push('some reviews have no tracks')
  if (missingGenres > 0) problems.push('some albums have no genres')

  console.log('')
  console.log(problems.length ? `FAIL: ${problems.join('; ')}` : 'OK: migration looks complete')
  if (problems.length) process.exitCode = 1
}

main().finally(() => prisma.$disconnect())
