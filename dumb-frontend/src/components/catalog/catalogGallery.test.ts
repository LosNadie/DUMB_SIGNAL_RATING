import { describe, expect, it } from 'vitest'
import type { AnimeItem, MovieItem, ReviewItem } from '../../types/models'
import {
  getCatalogGenres,
  getCatalogSourceSignature,
  getCatalogYear,
  normalizeAnimeCatalogItem,
  normalizeMovieCatalogItem,
  normalizeMusicCatalogItem,
  resolveCatalogImage,
} from './catalogGallery'

describe('catalog gallery normalization', () => {
  it('normalizes music metadata and route', () => {
    const item = {
      id: 7,
      albumTitle: 'Album',
      title: 'Review',
      artist: 'Artist',
      coverImage: '/uploads/music.webp',
      score: 8.25,
      releaseDate: '2024-04-10',
    } as ReviewItem

    expect(normalizeMusicCatalogItem(item)).toEqual({
      id: 7,
      imageUrl: '/uploads/music.webp',
      title: 'Album',
      eyebrow: 'MUSIC / 2024',
      metaLabel: 'ARTIST',
      meta: 'Artist',
      score: '8.3',
      route: '/music/7',
    })
  })

  it('normalizes anime and movie ownership fields', () => {
    const anime = {
      id: 2,
      title: 'Anime',
      studio: 'Studio',
      coverImage: '/mock-covers/anime.webp',
      score: 9,
      releaseDate: 'invalid',
    } as AnimeItem
    const movie = {
      id: 3,
      title: 'Movie',
      director: 'Director',
      coverImage: 'https://images.example/movie.webp',
      score: 7,
      releaseDate: '2020-08-01',
    } as MovieItem

    expect(normalizeAnimeCatalogItem(anime)).toMatchObject({
      eyebrow: 'ANIME / ARCHIVE',
      metaLabel: 'STUDIO',
      meta: 'Studio',
      route: '/anime/2',
    })
    expect(normalizeMovieCatalogItem(movie)).toMatchObject({
      eyebrow: 'MOVIE / 2020',
      metaLabel: 'DIRECTOR',
      meta: 'Director',
      route: '/movie/3',
    })
  })

  it('uses stable fallbacks for missing fields and images', () => {
    const item = {
      id: 4,
      title: '',
      studio: '',
      coverImage: '',
      score: Number.NaN,
    } as AnimeItem
    expect(normalizeAnimeCatalogItem(item)).toMatchObject({
      imageUrl: '',
      title: 'UNTITLED SIGNAL',
      meta: 'UNKNOWN STUDIO',
      score: 'N/A',
    })
  })

  it('resolves supported image URL forms', () => {
    expect(resolveCatalogImage('/uploads/a.webp')).toBe('/uploads/a.webp')
    expect(resolveCatalogImage('/covers/a.webp', 'https://api.example')).toBe('https://api.example/covers/a.webp')
    expect(resolveCatalogImage('https://cdn.example/a.webp')).toBe('https://cdn.example/a.webp')
    expect(resolveCatalogImage()).toBe('')
  })

  it('parses years and genres safely', () => {
    expect(getCatalogYear('2023-01-02')).toBe('2023')
    expect(getCatalogYear('invalid')).toBe('')
    expect(getCatalogGenres('Drama, Sci-Fi, ')).toEqual(['Drama', 'Sci-Fi'])
    expect(getCatalogGenres()).toEqual([])
  })

  it('only changes the source signature when catalog-visible data changes', () => {
    const source = {
      id: 1,
      title: 'Signal',
      coverImage: '/uploads/a.webp',
      score: 8,
      content: 'First body',
    }
    const original = [source]
    const sameCatalogData = [{
      ...source,
      content: 'Updated body',
      backgroundImage: '/uploads/background.webp',
      publishTime: '2026-08-15T10:00:00',
      updateTime: '2026-08-15T11:00:00',
    }]
    const updatedCover = [{ ...source, coverImage: '/uploads/b.webp' }]

    expect(getCatalogSourceSignature(sameCatalogData)).toBe(getCatalogSourceSignature(original))
    expect(getCatalogSourceSignature(updatedCover)).not.toBe(getCatalogSourceSignature(original))
  })
})
