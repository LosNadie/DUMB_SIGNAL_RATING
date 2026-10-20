import { describe, expect, it } from 'vitest'

import {
  buildExcerpt,
  cleanTrackName,
  isLeadTrack,
  parseLegacyReviewContent,
  parseLegacyTitle,
  parsePeopleList,
  stripHtml,
} from '@/lib/legacy-content'

describe('parseLegacyReviewContent', () => {
  it('extracts metadata lines and leaves the body', () => {
    const raw = [
      '风格：POP,ROCK',
      '年份：2012',
      '曲目：La Vie en Rose / 两者 / 艳火⭐ / 我想你要走了',
      '背景：/uploads/cover.jpg',
      '<p>正文第一段</p>',
      '<p>正文第二段</p>',
    ].join('\n')

    const parsed = parseLegacyReviewContent(raw)
    expect(parsed.genres).toEqual(['POP', 'ROCK'])
    expect(parsed.year).toBe(2012)
    expect(parsed.tracks).toEqual(['La Vie en Rose', '两者', '艳火⭐', '我想你要走了'])
    expect(parsed.backgroundImage).toBe('/uploads/cover.jpg')
    expect(parsed.contentHtml).toBe('<p>正文第一段</p>\n<p>正文第二段</p>')
  })

  it('keeps commas inside track names', () => {
    const parsed = parseLegacyReviewContent('曲目：Love, New Year / Weird Fishes/Arpeggi')
    expect(parsed.tracks).toEqual(['Love, New Year', 'Weird Fishes/Arpeggi'])
  })

  it('does not treat prose starting with a prefix as metadata once HTML has begun', () => {
    const raw = '<p>开头</p>\n背景：这只是正文里的一行'
    const parsed = parseLegacyReviewContent(raw)
    expect(parsed.backgroundImage).toBeNull()
    expect(parsed.contentHtml).toContain('背景：这只是正文里的一行')
  })

  it('parses MV links', () => {
    const parsed = parseLegacyReviewContent('MV：https://www.youtube.com/watch?v=abc\n<p>x</p>')
    expect(parsed.mvUrl).toBe('https://www.youtube.com/watch?v=abc')
  })

  it('returns empty defaults for plain HTML', () => {
    const parsed = parseLegacyReviewContent('<p>只有正文</p>')
    expect(parsed.genres).toEqual([])
    expect(parsed.year).toBeNull()
    expect(parsed.tracks).toEqual([])
  })
})

describe('parseLegacyTitle', () => {
  it('splits on the first spaced hyphen', () => {
    expect(parseLegacyTitle('Radiohead - OK Computer')).toEqual({
      artist: 'Radiohead',
      albumTitle: 'OK Computer',
    })
  })

  it('keeps hyphens inside the album name', () => {
    expect(parseLegacyTitle('Artist - Album - Deluxe')).toEqual({
      artist: 'Artist',
      albumTitle: 'Album - Deluxe',
    })
  })

  it('falls back to the whole title when no separator exists', () => {
    expect(parseLegacyTitle('Untitled')).toEqual({ artist: '', albumTitle: 'Untitled' })
  })
})

describe('text helpers', () => {
  it('strips tags and entities', () => {
    expect(stripHtml('<p>A &amp; B</p><script>x()</script>')).toBe('A & B')
  })

  it('truncates excerpts', () => {
    expect(buildExcerpt('<p>' + 'a'.repeat(200) + '</p>', 10)).toBe('aaaaaaaaaa…')
  })

  it('detects and removes the lead-track star', () => {
    expect(isLeadTrack('艳火⭐')).toBe(true)
    expect(cleanTrackName('艳火⭐')).toBe('艳火')
  })

  it('splits actor lists on Chinese and ASCII separators', () => {
    expect(parsePeopleList('杨静怡，张震, 李四')).toEqual(['杨静怡', '张震', '李四'])
  })
})

describe('splitTracks heuristics', () => {
  it('splits on bare slashes when no spaced slash exists', () => {
    const parsed = parseLegacyReviewContent('曲目：UFO/Dive/Ladies Room/No Man')
    expect(parsed.tracks).toEqual(['UFO', 'Dive', 'Ladies Room', 'No Man'])
  })

  it('prefers spaced slashes when present', () => {
    const parsed = parseLegacyReviewContent('曲目：Weird Fishes/Arpeggi / Nude / 15 Step')
    expect(parsed.tracks).toEqual(['Weird Fishes/Arpeggi', 'Nude', '15 Step'])
  })
})
