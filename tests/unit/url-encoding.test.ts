import { describe, expect, it } from 'vitest'

import { slugify } from '@/lib/slug'

/**
 * Regression guard for two production bugs found by the e2e suite:
 *
 * 1. Slugs keep CJK characters, but Next writes redirect and revalidation
 *    targets into HTTP headers, which only accept ASCII (latin-1). Passing a
 *    raw CJK slug caused "Cannot convert argument to a ByteString" 500s.
 * 2. Editor-supplied genre labels must resolve through the catalogue,
 *    otherwise the same Chinese name is stored under two slugs and violates
 *    the unique constraint on `genres.name`.
 */

/** Mirrors the encoding used by the redirect and revalidation paths. */
function encodePathSegment(slug: string): string {
  return encodeURIComponent(slug)
}

describe('URL encoding of CJK slugs', () => {
  it('produces ASCII-only output', () => {
    const slug = slugify('测试艺人 - 测试专辑')
    const encoded = encodePathSegment(slug)
    expect(encoded).toMatch(/^[\x20-\x7E]+$/)
    expect(encoded).not.toMatch(/[一-鿿]/)
  })

  it('round-trips back to the stored slug', () => {
    const slug = '葬送的芙莉莲-4'
    expect(decodeURIComponent(encodePathSegment(slug))).toBe(slug)
  })

  it('leaves ASCII slugs unchanged', () => {
    expect(encodePathSegment('oklou-choke-enough-10')).toBe('oklou-choke-enough-10')
  })

  it('escapes characters that are invalid in a header', () => {
    // The exact failure mode: a raw CJK string is not a valid header value.
    const slug = slugify('张悬 神的游戏')
    expect(() => new Headers({ location: `/music/${slug}` })).toThrow()
    expect(() => new Headers({ location: `/music/${encodePathSegment(slug)}` })).not.toThrow()
  })
})

describe('genre label resolution', () => {
  it('resolves editor labels to the canonical catalogue slug', async () => {
    const { findGenre, resolveGenreSlug } = await import('@/lib/genres')

    // These are the labels the admin picker submits.
    expect(findGenre('后摇')?.slug).toBe('post-rock')
    expect(findGenre('摇滚')?.slug).toBe('rock')
    expect(findGenre('剧情')?.slug).toBe('drama')
    expect(findGenre('奇幻')?.slug).toBe('fantasy')

    // resolveGenreSlug must agree with the catalogue, not invent a new slug.
    for (const label of ['后摇', '摇滚', '剧情', '奇幻', 'R&B']) {
      expect(resolveGenreSlug(label)).toBe(findGenre(label)?.slug)
    }
  })

  it('never produces two slugs for one label', async () => {
    const { resolveGenreSlug } = await import('@/lib/genres')
    expect(resolveGenreSlug('后摇')).toBe(resolveGenreSlug(' 后摇 '))
    expect(resolveGenreSlug('后摇')).not.toBe(slugify('后摇'))
  })

  it('legacy ASCII codes map onto the same rows as Chinese labels', async () => {
    const { resolveGenreSlug } = await import('@/lib/genres')
    expect(resolveGenreSlug('ROCK')).toBe(resolveGenreSlug('摇滚'))
    expect(resolveGenreSlug('RNB')).toBe(resolveGenreSlug('R&B'))
  })
})
