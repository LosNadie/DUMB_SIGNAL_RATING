import { siteUrl } from '@/lib/env'
import { absoluteUrl } from '@/lib/images'

import { SITE_DESCRIPTION, SITE_NAME } from './metadata'

type JsonLd = Record<string, unknown>

const abs = (path: string) => absoluteUrl(path, siteUrl)

export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: abs('/'),
    inLanguage: 'zh-CN',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${abs('/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export interface BreadcrumbEntry {
  name: string
  path: string
}

export function breadcrumbJsonLd(entries: BreadcrumbEntry[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: abs(entry.path),
    })),
  }
}

export interface ReviewJsonLdInput {
  title: string
  path: string
  description: string
  score: number
  image?: string | null
  publishedAt?: Date | null
  authorName: string
  album: {
    title: string
    artist: string
    releaseDate?: Date | null
    genres?: string[]
  }
}

export function reviewJsonLd(input: ReviewJsonLdInput): JsonLd {
  const album: JsonLd = {
    '@type': 'MusicAlbum',
    name: input.album.title,
    byArtist: { '@type': 'MusicGroup', name: input.album.artist },
  }
  if (input.album.releaseDate) {
    album.datePublished = input.album.releaseDate.toISOString().slice(0, 10)
  }
  if (input.album.genres?.length) album.genre = input.album.genres

  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: input.title,
    url: abs(input.path),
    description: input.description,
    inLanguage: 'zh-CN',
    datePublished: input.publishedAt?.toISOString(),
    author: { '@type': 'Person', name: input.authorName },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: input.score,
      bestRating: 10,
      worstRating: 0,
    },
    itemReviewed: album,
    ...(input.image ? { image: abs(input.image) } : {}),
  }
}

export interface AnimeJsonLdInput {
  title: string
  path: string
  description: string
  score: number
  image?: string | null
  studio: string
  releaseDate?: Date | null
  genres?: string[]
  publishedAt?: Date | null
}

export function animeJsonLd(input: AnimeJsonLdInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TVSeries',
        name: input.title,
        url: abs(input.path),
        description: input.description,
        inLanguage: 'ja',
        productionCompany: { '@type': 'Organization', name: input.studio },
        ...(input.releaseDate ? { startDate: input.releaseDate.toISOString().slice(0, 10) } : {}),
        ...(input.genres?.length ? { genre: input.genres } : {}),
        ...(input.image ? { image: abs(input.image) } : {}),
      },
      {
        '@type': 'Review',
        name: input.title,
        url: abs(input.path),
        reviewBody: input.description,
        datePublished: input.publishedAt?.toISOString(),
        inLanguage: 'zh-CN',
        reviewRating: { '@type': 'Rating', ratingValue: input.score, bestRating: 10, worstRating: 0 },
        itemReviewed: { '@type': 'TVSeries', name: input.title },
        author: { '@type': 'Organization', name: SITE_NAME },
      },
    ],
  }
}

export interface MovieJsonLdInput {
  title: string
  path: string
  description: string
  score: number
  image?: string | null
  director: string
  actors: string[]
  releaseDate?: Date | null
  genres?: string[]
  publishedAt?: Date | null
}

export function movieJsonLd(input: MovieJsonLdInput): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Movie',
        name: input.title,
        url: abs(input.path),
        description: input.description,
        inLanguage: 'zh-CN',
        director: { '@type': 'Person', name: input.director },
        ...(input.actors.length
          ? { actor: input.actors.map((name) => ({ '@type': 'Person', name })) }
          : {}),
        ...(input.releaseDate ? { datePublished: input.releaseDate.toISOString().slice(0, 10) } : {}),
        ...(input.genres?.length ? { genre: input.genres } : {}),
        ...(input.image ? { image: abs(input.image) } : {}),
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: input.score,
          bestRating: 10,
          worstRating: 0,
          ratingCount: 1,
        },
      },
      {
        '@type': 'Review',
        name: input.title,
        url: abs(input.path),
        reviewBody: input.description,
        datePublished: input.publishedAt?.toISOString(),
        inLanguage: 'zh-CN',
        reviewRating: { '@type': 'Rating', ratingValue: input.score, bestRating: 10, worstRating: 0 },
        itemReviewed: { '@type': 'Movie', name: input.title },
        author: { '@type': 'Organization', name: SITE_NAME },
      },
    ],
  }
}

/** Escape `<` so user content cannot close the script element. */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
