/**
 * Seed the database with the genre catalogue, an admin account and a small
 * demo dataset (adapted from the previous frontend's mock data).
 *
 * Idempotent: every write is an upsert, so it can run on an existing database.
 * Real content is imported with `pnpm legacy:import`.
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { buildExcerpt, parseLegacyReviewContent } from '../src/lib/legacy-content'
import { GENRES, resolveGenreSlug } from '../src/lib/genres'
import { uniqueSlug } from '../src/lib/slug'

const prisma = new PrismaClient()

const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin'
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin123'
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@dumb.com'

async function seedGenres() {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name },
      create: { name: genre.name, slug: genre.slug },
    })
  }
  console.log(`genres: ${GENRES.length} ensured`)
}

async function seedAdmin() {
  const passwordHash = await bcrypt.hash(adminPassword, 10)
  // Re-running the seed after a legacy import restores the known password
  // (the imported hash cannot be reversed).
  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: { role: 'ADMIN', status: 'ENABLED', passwordHash },
    create: {
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      status: 'ENABLED',
    },
  })
  console.log(`admin: ${admin.username} (#${admin.id})`)
  return admin
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

const DEMO_REVIEWS = [
  {
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    genre: 'POP',
    year: 2021,
    score: 9.2,
    cover: '/mock-covers/sour.jpg',
    tracks: ['brutal', 'drivers license', 'good 4 u'],
    content:
      '<p>Olivia Rodrigo 的首张专辑《SOUR》是一张关于青少年心碎的宣言作品。从《drivers license》到《good 4 u》，这张专辑将情感脆弱性与流行朋克的愤怒能量融合。</p>',
  },
  {
    artist: 'Radiohead',
    album: 'In Rainbows',
    genre: 'ROCK,ELECTRONIC',
    year: 2007,
    score: 8.8,
    cover: '/mock-covers/in-rainbows.jpg',
    tracks: ['15 Step', 'Nude', 'Weird Fishes/Arpeggi'],
    content:
      '<p>《In Rainbows》是 Radiohead 最温暖、最具人性气息的专辑。《Weird Fishes/Arpeggi》营造出在深海中沉浮的迷失感。</p>',
  },
  {
    artist: '张悬',
    album: '神的游戏',
    genre: 'FOLK,ROCK',
    year: 2012,
    score: 8.9,
    cover: '/mock-covers/zhangxuan.jpg',
    tracks: ['玫瑰色的你', '喜欢'],
    content:
      '<p>张悬的《神的游戏》是华语独立音乐的新高度——既私人又普世。《玫瑰色的你》《喜欢》皆是经典。</p>',
  },
]

const DEMO_ANIME = [
  {
    title: '葬送的芙莉莲',
    studio: 'MADHOUSE',
    genre: '奇幻,冒险,治愈',
    release: '2023-09-29',
    score: 9.0,
    cover: '/mock-covers/frieren.jpg',
    content:
      '<p>勇者小队击败魔王后的故事。精灵魔法师芙莉莲在同伴离世后才开始真正理解人类的情感与生命的短暂。</p>',
  },
  {
    title: '孤独摇滚！',
    studio: 'CloverWorks',
    genre: '音乐,日常,搞笑,青春',
    release: '2022-10-09',
    score: 8.8,
    cover: '/mock-covers/bocchi.jpg',
    content:
      '<p>极度社恐的吉他手后藤独在加入乐队后逐渐走出自我封闭的故事，精准捕捉了社恐人群的心理。</p>',
  },
]

const DEMO_MOVIES = [
  {
    title: '奥本海默',
    director: '克里斯托弗·诺兰',
    actors: ['基里安·墨菲', '艾米莉·布朗特', '马特·达蒙'],
    genre: '剧情,传记,历史',
    region: '美洲',
    release: '2023-07-21',
    score: 8.8,
    cover: '/mock-covers/oppenheimer.jpg',
    content:
      '<p>诺兰以惊人的内在张力诠释了这位原子弹之父的矛盾灵魂，通过三线叙事构建了关于权力和道德的宏大拼图。</p>',
  },
  {
    title: '寄生虫',
    director: '奉俊昊',
    actors: ['宋康昊', '李善均', '赵汝贞', '崔宇植'],
    genre: '剧情,惊悚',
    region: '亚洲',
    release: '2019-05-30',
    score: 9.0,
    cover: '/mock-covers/parasite.jpg',
    content:
      '<p>奉俊昊以精密的类型电影语法撕开了社会阶层的伪装，从喜剧到惊悚的自然过渡展示了他对观众情绪的精湛掌控。</p>',
  },
]

async function connectGenres(raw: string) {
  const labels = raw.split(',').map((item) => item.trim()).filter(Boolean)
  const connections: { id: number }[] = []
  for (const label of labels) {
    const slug = resolveGenreSlug(label)
    const known = GENRES.find((genre) => genre.slug === slug)
    const genre = await prisma.genre.upsert({
      where: { slug },
      update: {},
      create: { name: known?.name ?? label, slug },
      select: { id: true },
    })
    connections.push({ id: genre.id })
  }
  return connections
}

async function seedContent(authorId: number) {
  const takenReviews = new Set((await prisma.review.findMany({ select: { slug: true } })).map((r) => r.slug))
  const takenAnime = new Set((await prisma.anime.findMany({ select: { slug: true } })).map((r) => r.slug))
  const takenMovies = new Set((await prisma.movie.findMany({ select: { slug: true } })).map((r) => r.slug))

  for (const [index, item] of DEMO_REVIEWS.entries()) {
    const genres = await connectGenres(item.genre)
    const album = await prisma.album.upsert({
      where: { artist_title: { artist: item.artist, title: item.album } },
      update: {},
      create: {
        artist: item.artist,
        title: item.album,
        coverImage: item.cover,
        releaseDate: new Date(Date.UTC(item.year, 0, 1)),
        genres: { connect: genres },
      },
      select: { id: true },
    })
    const slug = uniqueSlug(`${item.artist} ${item.album}`, takenReviews)
    const parsed = parseLegacyReviewContent(item.content)
    await prisma.review.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        albumId: album.id,
        authorId,
        title: `${item.artist} - ${item.album}`,
        excerpt: buildExcerpt(item.content),
        contentHtml: parsed.contentHtml || item.content,
        coverImage: item.cover,
        tracks: item.tracks,
        score: item.score,
        status: 'PUBLISHED',
        publishedAt: daysAgo(index),
      },
    })
  }

  for (const [index, item] of DEMO_ANIME.entries()) {
    const genres = await connectGenres(item.genre)
    const slug = uniqueSlug(item.title, takenAnime)
    await prisma.anime.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        authorId,
        title: item.title,
        excerpt: buildExcerpt(item.content),
        contentHtml: item.content,
        coverImage: item.cover,
        backgroundImage: item.cover,
        score: item.score,
        studio: item.studio,
        releaseDate: new Date(`${item.release}T00:00:00Z`),
        status: 'PUBLISHED',
        publishedAt: daysAgo(index + 1),
        genres: { connect: genres },
      },
    })
  }

  for (const [index, item] of DEMO_MOVIES.entries()) {
    const genres = await connectGenres(item.genre)
    const slug = uniqueSlug(item.title, takenMovies)
    await prisma.movie.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        authorId,
        title: item.title,
        excerpt: buildExcerpt(item.content),
        contentHtml: item.content,
        coverImage: item.cover,
        backgroundImage: item.cover,
        score: item.score,
        director: item.director,
        actors: item.actors,
        region: item.region,
        releaseDate: new Date(`${item.release}T00:00:00Z`),
        status: 'PUBLISHED',
        publishedAt: daysAgo(index + 2),
        genres: { connect: genres },
      },
    })
  }

  console.log(`content: ${DEMO_REVIEWS.length} reviews, ${DEMO_ANIME.length} anime, ${DEMO_MOVIES.length} movies ensured`)
}

async function main() {
  await seedGenres()
  const admin = await seedAdmin()
  await seedContent(admin.id)

  const counts = {
    users: await prisma.user.count(),
    genres: await prisma.genre.count(),
    albums: await prisma.album.count(),
    reviews: await prisma.review.count(),
    anime: await prisma.anime.count(),
    movies: await prisma.movie.count(),
    comments: await prisma.comment.count(),
  }
  console.log('counts:', counts)
  console.log(`\nSign in with ${adminUsername} / ${adminPassword} (change this in production).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
