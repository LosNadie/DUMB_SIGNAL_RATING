/**
 * Slug generation for content URLs.
 *
 * Chinese titles cannot be transliterated reliably without a dependency, so
 * we keep CJK characters verbatim (they are valid in URLs and are actually
 * useful for Chinese SEO) and strip punctuation/whitespace.
 */

const RESERVED = new Set([
  'admin',
  'api',
  'login',
  'logout',
  'register',
  'search',
  'music',
  'anime',
  'movie',
  'about',
  'profile',
  'uploads',
])

export function slugify(input: string): string {
  const base = input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['"’‘“”]/g, '')
    .replace(/[^\p{Script=Han}\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return base || 'signal'
}

/**
 * Build a slug that is unique against a set of already-taken slugs.
 * Collisions append `-2`, `-3`, …; an optional suffix (usually the legacy id)
 * can be supplied so re-running an import stays deterministic.
 */
export function uniqueSlug(input: string, taken: Set<string>, suffix?: string | number): string {
  const base = slugify(input)
  const preferred = suffix !== undefined ? `${base}-${suffix}` : base

  let candidate = preferred
  let counter = 2
  while (taken.has(candidate) || RESERVED.has(candidate)) {
    candidate = `${preferred}-${counter}`
    counter += 1
  }
  taken.add(candidate)
  return candidate
}

/** True when a route segment should be treated as a legacy numeric id. */
export function isNumericId(value: string): boolean {
  return /^\d+$/.test(value)
}
