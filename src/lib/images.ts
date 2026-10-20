/**
 * Image URL helpers.
 *
 * Every relative media path now resolves against this application: uploads
 * are served from /uploads/* and seeded covers live in /mock-covers/*. The
 * old hardcoded `http://localhost:8080` origin is gone.
 */

const FALLBACK_COVER = '/og-default.svg'

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return FALLBACK_COVER
  const trimmed = url.trim()
  if (!trimmed) return FALLBACK_COVER
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed
  if (trimmed.startsWith('/')) return trimmed
  return `/${trimmed.replace(/^\.?\//, '')}`
}

/** Absolute URL for metadata/OG tags. */
export function absoluteUrl(pathOrUrl: string, siteUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  const base = siteUrl.replace(/\/+$/, '')
  return `${base}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`
}

export function coverOrFallback(url: string | null | undefined): string {
  return resolveImageUrl(url)
}

export { FALLBACK_COVER }
