import 'server-only'

import { env } from '@/lib/env'

export interface LastFmAlbumContext {
  artistName: string
  albumName: string
  trackNames: string[]
  coverImageUrl: string | null
  releaseDate: string | null
  mbid: string | null
  url: string | null
}

interface LastFmImage {
  '#text'?: string
  size?: string
}

interface LastFmAlbum {
  name?: string
  artist?: string
  url?: string
  mbid?: string
  releasedate?: string
  image?: LastFmImage[]
  tracks?: { track?: { name?: string }[] | { name?: string } }
}

interface LastFmResponse {
  error?: number
  message?: string
  album?: LastFmAlbum
  results?: { albummatches?: { album?: LastFmAlbum[] } }
}

function pickCover(images: LastFmImage[] | undefined): string | null {
  if (!images?.length) return null
  const preferred = ['mega', 'extralarge', 'large']
  for (const size of preferred) {
    const match = images.find((image) => image.size === size && image['#text'])
    if (match?.['#text']) return match['#text']
  }
  return images.find((image) => image['#text'])?.['#text'] ?? null
}

function normaliseTrackNames(tracks: LastFmAlbum['tracks']): string[] {
  if (!tracks) return []
  const raw = Array.isArray(tracks.track) ? tracks.track : tracks.track ? [tracks.track] : []
  return raw.map((track) => (track.name ?? '').trim()).filter(Boolean)
}

function toContext(album: LastFmAlbum): LastFmAlbumContext | null {
  const trackNames = normaliseTrackNames(album.tracks)
  if (!album.name || !album.artist || trackNames.length === 0) return null
  return {
    artistName: album.artist,
    albumName: album.name,
    trackNames,
    coverImageUrl: pickCover(album.image),
    releaseDate: album.releasedate?.trim() || null,
    mbid: album.mbid?.trim() || null,
    url: album.url?.trim() || null,
  }
}

async function request(params: Record<string, string>): Promise<LastFmResponse | null> {
  if (!env.LASTFM_ENABLED || !env.LASTFM_API_KEY) return null

  const url = new URL(env.LASTFM_BASE_URL)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  url.searchParams.set('api_key', env.LASTFM_API_KEY)
  url.searchParams.set('format', 'json')

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'User-Agent': 'DUMB-SIGNAL/1.0' },
    })
    if (!response.ok) return null
    return (await response.json()) as LastFmResponse
  } catch {
    return null
  }
}

/**
 * Resolve an album to its official tracklist. Tries `album.getInfo` first,
 * then `album.search` and fetches the best match (legacy behaviour).
 */
export async function findAlbum(
  artist: string,
  albumTitle: string,
): Promise<LastFmAlbumContext | null> {
  const direct = await request({
    method: 'album.getInfo',
    artist,
    album: albumTitle,
    autocorrect: env.LASTFM_AUTOCORRECT ? '1' : '0',
  })
  if (direct && !direct.error && direct.album) {
    const context = toContext(direct.album)
    if (context) return context
  }

  const search = await request({
    method: 'album.search',
    album: `${artist} ${albumTitle}`,
    limit: '10',
  })
  const matches = search?.results?.albummatches?.album ?? []
  const normalisedArtist = artist.toLowerCase()
  const normalisedAlbum = albumTitle.toLowerCase()

  const best =
    matches.find(
      (match) =>
        (match.artist ?? '').toLowerCase() === normalisedArtist &&
        (match.name ?? '').toLowerCase() === normalisedAlbum,
    ) ?? matches[0]

  if (!best?.artist || !best.name) return null

  const info = await request({
    method: 'album.getInfo',
    artist: best.artist,
    album: best.name,
    autocorrect: env.LASTFM_AUTOCORRECT ? '1' : '0',
  })
  if (!info?.album) return null
  return toContext(info.album)
}

/** Track list exactly as returned by the source; lead track gets a star. */
export function buildTracksFromSource(names: string[], leadTrack: string | null): string {
  const lead = leadTrack?.trim() || null
  let starred = false
  return names
    .filter((name) => name.trim())
    .map((name) => {
      if (!starred && lead && name.trim() === lead) {
        starred = true
        return `${name}⭐`
      }
      return name
    })
    .join(' / ')
}
