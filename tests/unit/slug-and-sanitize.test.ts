import { describe, expect, it } from 'vitest'

import { isNumericId, slugify, uniqueSlug } from '@/lib/slug'
import { sanitizeContent } from '@/lib/sanitize'
import { formatDate, formatDateTime, formatViews } from '@/lib/format'
import { parseGenreList, resolveGenreSlug } from '@/lib/genres'

describe('slugify', () => {
  it('keeps CJK characters', () => {
    expect(slugify('葬送的芙莉莲')).toBe('葬送的芙莉莲')
  })

  it('lowercases and hyphenates ASCII titles', () => {
    expect(slugify('Radiohead - OK Computer!')).toBe('radiohead-ok-computer')
  })

  it('falls back when nothing is usable', () => {
    expect(slugify('！！！')).toBe('signal')
  })
})

describe('uniqueSlug', () => {
  it('appends the legacy id', () => {
    expect(uniqueSlug('SOUR', new Set(), 10)).toBe('sour-10')
  })

  it('avoids collisions', () => {
    const taken = new Set(['sour-10'])
    expect(uniqueSlug('SOUR', taken, 10)).toBe('sour-10-2')
  })

  it('never collides with a route prefix', () => {
    expect(uniqueSlug('admin', new Set())).toBe('admin-2')
  })
})

describe('isNumericId', () => {
  it('matches digits only', () => {
    expect(isNumericId('10')).toBe(true)
    expect(isNumericId('10a')).toBe(false)
  })
})

describe('sanitizeContent', () => {
  it('keeps article markup', () => {
    expect(sanitizeContent('<p>a<strong>b</strong></p>')).toBe('<p>a<strong>b</strong></p>')
  })

  it('removes scripts and inline handlers', () => {
    expect(sanitizeContent('<p onclick="x()">a</p><script>bad()</script>')).toBe('<p>a</p>')
  })

  it('keeps whitelisted video iframes', () => {
    const html = '<iframe src="https://www.youtube.com/embed/abc"></iframe>'
    expect(sanitizeContent(html)).toContain('youtube.com/embed/abc')
  })

  it('drops iframes from other hosts', () => {
    expect(sanitizeContent('<iframe src="https://evil.example/x"></iframe>')).not.toContain('evil.example')
  })

  it('forces safe rel on links and lazy loading on images', () => {
    const html = sanitizeContent('<a href="https://x.com">x</a><img src="/a.png">')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('loading="lazy"')
  })
})

describe('format helpers', () => {
  it('formats dates in Beijing time', () => {
    expect(formatDate(new Date('2026-03-02T17:28:26Z'))).toBe('2026-03-03')
    expect(formatDateTime(new Date('2026-03-02T17:28:26Z'))).toBe('2026-03-03 01:28')
  })

  it('formats large view counts', () => {
    expect(formatViews(999)).toBe('999')
    expect(formatViews(12345)).toBe('1.2 万')
  })
})

describe('genre resolution', () => {
  it('maps legacy ASCII codes to slugs', () => {
    expect(resolveGenreSlug('RNB')).toBe('r-and-b')
    expect(resolveGenreSlug('HIP_HOP')).toBe('hip-hop')
    expect(resolveGenreSlug('FOLK')).toBe('folk')
  })

  it('keeps unknown labels deterministic', () => {
    const first = resolveGenreSlug('某个新风格')
    expect(first).toBe(resolveGenreSlug('某个新风格'))
    expect(first).toMatch(/^genre-[0-9a-f]+$/)
  })

  it('parses legacy genre strings', () => {
    expect(parseGenreList('ROCK,POP')).toEqual(['ROCK', 'POP'])
    expect(parseGenreList('治愈,战斗,成长')).toEqual(['治愈', '战斗', '成长'])
    expect(parseGenreList(null)).toEqual([])
  })
})
