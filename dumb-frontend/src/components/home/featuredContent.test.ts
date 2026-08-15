import { describe, expect, it } from 'vitest'
import type { AnimeItem, MovieItem, ReviewItem } from '../../types/models'
import {
  extractReviewBackground,
  resolveFeaturedImage,
  selectFeaturedContents,
  selectLatestFeaturedContent,
} from './featuredContent'

function review(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: 1,
    albumId: 1,
    title: 'Review title',
    content: '',
    coverImage: '/music.jpg',
    score: 9,
    authorName: 'Author',
    albumTitle: 'Album',
    artist: 'Artist',
    genre: 'Rock',
    releaseDate: '2026-01-01',
    publishTime: '2026-08-01T00:00:00+08:00',
    ...overrides,
  }
}

function anime(overrides: Partial<AnimeItem> = {}): AnimeItem {
  return {
    id: 2,
    title: 'Anime',
    content: '',
    coverImage: '/anime-cover.jpg',
    backgroundImage: '/anime-background.jpg',
    score: 8,
    studio: 'Studio',
    publishTime: '2026-08-02T00:00:00+08:00',
    views: 10,
    ...overrides,
  }
}

function movie(overrides: Partial<MovieItem> = {}): MovieItem {
  return {
    id: 3,
    title: 'Movie',
    content: '',
    coverImage: '/movie-cover.jpg',
    backgroundImage: '/movie-background.jpg',
    score: 8.5,
    director: 'Director',
    actors: 'Actor',
    publishTime: '2026-08-03T00:00:00+08:00',
    views: 20,
    ...overrides,
  }
}

describe('selectLatestFeaturedContent', () => {
  it('builds a newest-first queue across all three categories', () => {
    const result = selectFeaturedContents(
      [review({ publishTime: '2026-08-01T00:00:00+08:00' })],
      [anime({ publishTime: '2026-08-03T00:00:00+08:00' })],
      [movie({ publishTime: '2026-08-02T00:00:00+08:00' })],
    )

    expect(result.map((item) => item.category)).toEqual(['ANIME', 'MOVIE', 'MUSIC'])
  })

  it('selects the newest item across all three categories', () => {
    const result = selectLatestFeaturedContent([review()], [anime()], [movie()])

    expect(result).toMatchObject({
      id: 3,
      category: 'MOVIE',
      title: 'Movie',
      meta: 'Director',
      imageUrl: '/movie-cover.jpg',
      route: '/movie/3',
    })
  })

  it('uses updateTime when it is newer than publishTime', () => {
    const result = selectLatestFeaturedContent(
      [review({ updateTime: '2026-08-10T12:00:00+08:00' })],
      [anime()],
      [movie()],
    )

    expect(result?.category).toBe('MUSIC')
    expect(result?.timestamp).toBe(new Date('2026-08-10T12:00:00+08:00').getTime())
  })

  it('keeps invalid timestamps deterministic and returns valid routes', () => {
    const result = selectLatestFeaturedContent(
      [review({ publishTime: 'invalid', updateTime: 'invalid' })],
      [anime({ publishTime: 'invalid' })],
      [],
    )

    expect(result).toMatchObject({ category: 'MUSIC', route: '/music/1', timestamp: 0 })
  })

  it('prefers square cover images and falls back to category backgrounds', () => {
    const withCover = selectLatestFeaturedContent(
      [review({ content: '<p>背景：https://cdn.example.com/hero.jpg</p>' })],
      [],
      [],
    )
    const musicFallback = selectLatestFeaturedContent(
      [review({ coverImage: '', content: '<p>背景：https://cdn.example.com/hero.jpg</p>' })],
      [],
      [],
    )
    const animeFallback = selectLatestFeaturedContent(
      [],
      [anime({ coverImage: '', backgroundImage: '/anime-background.jpg' })],
      [],
    )
    const movieFallback = selectLatestFeaturedContent(
      [],
      [],
      [movie({ coverImage: '', backgroundImage: '/movie-background.jpg' })],
    )

    expect(withCover?.imageUrl).toBe('/music.jpg')
    expect(musicFallback?.imageUrl).toBe('https://cdn.example.com/hero.jpg')
    expect(animeFallback?.imageUrl).toBe('/anime-background.jpg')
    expect(movieFallback?.imageUrl).toBe('/movie-background.jpg')
    expect(extractReviewBackground('背景：/uploads/hero.jpg\n正文')).toBe('/uploads/hero.jpg')
    expect(resolveFeaturedImage('mock-covers/a.jpg')).toBe('/mock-covers/a.jpg')
  })

  it('returns null for an empty archive', () => {
    expect(selectLatestFeaturedContent([], [], [])).toBeNull()
  })
})
