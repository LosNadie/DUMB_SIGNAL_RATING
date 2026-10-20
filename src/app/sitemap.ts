import type { MetadataRoute } from 'next'

import { listAnimeSlugs } from '@/lib/data/anime'
import { listMovieSlugs } from '@/lib/data/movies'
import { listReviewSlugs } from '@/lib/data/reviews'
import { siteUrl } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reviews, animes, movies] = await Promise.all([
    listReviewSlugs(),
    listAnimeSlugs(),
    listMovieSlugs(),
  ])

  const base = siteUrl

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/music`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/anime`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/movie`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/about`, changeFrequency: 'monthly', priority: 0.3 },
  ]

  return [
    ...staticRoutes,
    ...reviews.map((review) => ({
      url: `${base}/music/${encodeURIComponent(review.slug)}`,
      lastModified: review.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...animes.map((anime) => ({
      url: `${base}/anime/${encodeURIComponent(anime.slug)}`,
      lastModified: anime.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...movies.map((movie) => ({
      url: `${base}/movie/${encodeURIComponent(movie.slug)}`,
      lastModified: movie.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
