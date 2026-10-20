import { describe, expect, it } from 'vitest'

import {
  buildListQuery,
  canonicalListPath,
  hasActiveFilters,
  parseListFilters,
  toOrderBy,
} from '@/lib/search-params'

describe('parseListFilters', () => {
  it('returns defaults for an empty query', () => {
    const filters = parseListFilters({})
    expect(filters).toMatchObject({ q: '', genre: '', sort: 'date', order: 'desc', page: 1, year: '', region: '' })
  })

  it('reads known values and ignores unknown ones', () => {
    const filters = parseListFilters({ q: 'radiohead', genre: 'post-rock', sort: 'score', order: 'asc', page: '3' })
    expect(filters).toMatchObject({ q: 'radiohead', genre: 'post-rock', sort: 'score', order: 'asc', page: 3 })
  })

  it('falls back to defaults for invalid values', () => {
    const filters = parseListFilters({ sort: 'nope', order: 'sideways', page: 'abc' })
    expect(filters.sort).toBe('date')
    expect(filters.order).toBe('desc')
    expect(filters.page).toBe(1)
  })

  it('clamps the page number', () => {
    expect(parseListFilters({ page: '-5' }).page).toBe(1)
    expect(parseListFilters({ page: '99999' }).page).toBe(500)
  })

  it('only reads year/region when enabled', () => {
    expect(parseListFilters({ year: '2024' }).year).toBe('')
    expect(parseListFilters({ year: '2024' }, { withYear: true }).year).toBe('2024')
    expect(parseListFilters({ region: '欧洲' }).region).toBe('')
    expect(parseListFilters({ region: '欧洲' }, { withRegion: true }).region).toBe('欧洲')
  })

  it('rejects malformed years', () => {
    expect(parseListFilters({ year: '24' }, { withYear: true }).year).toBe('')
  })
})

describe('buildListQuery', () => {
  it('returns "" for default values', () => {
    expect(buildListQuery({ sort: 'date', order: 'desc', page: 1 }, '/music')).toBe('/music')
  })

  it('encodes active filters', () => {
    expect(buildListQuery({ genre: 'post-rock', sort: 'score', page: 2 }, '/music')).toBe(
      '/music?genre=post-rock&sort=score&page=2',
    )
  })

  it('omits the search term from canonical URLs', () => {
    expect(canonicalListPath(parseListFilters({ q: 'x', genre: 'rock' }), '/music')).toBe('/music?genre=rock')
  })
})

describe('hasActiveFilters', () => {
  it('is false only for the default view', () => {
    expect(hasActiveFilters(parseListFilters({}))).toBe(false)
    expect(hasActiveFilters(parseListFilters({ genre: 'rock' }))).toBe(true)
    expect(hasActiveFilters(parseListFilters({ q: 'x' }))).toBe(true)
  })
})

describe('toOrderBy', () => {
  it('maps date sort to publishedAt', () => {
    expect(toOrderBy(parseListFilters({}))).toEqual([{ publishedAt: 'desc' }, { id: 'desc' }])
  })

  it('maps score sort to score', () => {
    expect(toOrderBy(parseListFilters({ sort: 'score', order: 'asc' }))).toEqual([
      { score: 'asc' },
      { id: 'desc' },
    ])
  })
})
