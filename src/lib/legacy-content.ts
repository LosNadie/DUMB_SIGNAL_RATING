/**
 * Legacy content parsing.
 *
 * The old editor stored structured metadata as line prefixes inside the HTML
 * body:
 *
 *   风格：ROCK,POP
 *   年份：2012
 *   曲目：Track A / Track B⭐ / Track C
 *   MV：https://…
 *   背景：/uploads/…
 *   <p>review body…</p>
 *
 * The new schema stores these as real columns. This module is the single
 * place that understands the legacy format, used by the importer, the admin
 * "paste legacy content" helper and the unit tests.
 */

export interface ParsedLegacyReview {
  genres: string[]
  year: number | null
  tracks: string[]
  mvUrl: string | null
  backgroundImage: string | null
  /** Body with the metadata lines removed. */
  contentHtml: string
}

const PREFIX = {
  genre: ['风格：', '风格:'],
  year: ['年份：', '年份:'],
  tracks: ['曲目：', '曲目:'],
  mv: ['MV：', 'MV:', 'mv：', 'mv:'],
  background: ['背景：', '背景:'],
}

function matchPrefix(line: string, prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    if (line.startsWith(prefix)) {
      return line.slice(prefix.length).trim()
    }
  }
  return null
}

/**
 * Track lists use " / " as the separator, but 13 of 95 legacy rows omit the
 * spaces. Rule:
 *  - if the line contains a spaced slash anywhere, split only on spaced
 *    slashes (keeps titles such as "Weird Fishes/Arpeggi" intact);
 *  - otherwise split on any slash, because the line has no other delimiter.
 */
function splitTracks(raw: string): string[] {
  if (/\s[/／]\s/.test(raw)) {
    // Keep unspaced slashes inside titles: "Weird Fishes/Arpeggi / Nude".
    return raw
      .split(/\s[/／]\s/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return mergeSlashTitles(raw.split(/[/／]/))
}

/**
 * A bare-slash split can cut a real title in half ("Weird Fishes" +
 * "Arpeggi"). Re-join a fragment with the previous one when it starts in
 * lowercase — track titles are capitalised, so a lowercase start is a strong
 * signal of the second half of a title rather than a new track.
 */
function mergeSlashTitles(parts: string[]): string[] {
  const result: string[] = []
  for (const part of parts) {
    const value = part.trim()
    if (!value) continue
    const previous = result[result.length - 1]
    if (previous && /^[a-z]/.test(value)) {
      result[result.length - 1] = `${previous}/${value}`
    } else {
      result.push(value)
    }
  }
  return result
}

function splitGenres(raw: string): string[] {
  return raw
    .split(/[,，、/／]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** Split `"Artist - Album"` into its two halves (used for legacy review titles). */
export function parseLegacyTitle(rawTitle: string): { artist: string; albumTitle: string } {
  const title = rawTitle.trim()
  const separatorIndex = title.indexOf(' - ')
  if (separatorIndex > 0) {
    return {
      artist: title.slice(0, separatorIndex).trim(),
      albumTitle: title.slice(separatorIndex + 3).trim(),
    }
  }
  return { artist: '', albumTitle: title }
}

/** Strip HTML and collapse whitespace, for excerpts and meta descriptions. */
export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildExcerpt(html: string, maxLength = 140): string {
  const text = stripHtml(html)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trimEnd()}…`
}

/**
 * Parse a legacy review body. Lines are only treated as metadata when they
 * appear before the first HTML tag, so prose that happens to start with
 * "背景：" is not eaten.
 */
export function parseLegacyReviewContent(raw: string): ParsedLegacyReview {
  const normalised = raw.replace(/\r\n/g, '\n')
  const lines = normalised.split('\n')

  const result: ParsedLegacyReview = {
    genres: [],
    year: null,
    tracks: [],
    mvUrl: null,
    backgroundImage: null,
    contentHtml: '',
  }

  const bodyLines: string[] = []
  let inBody = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!inBody && /</.test(line)) {
      inBody = true
    }

    if (!inBody) {
      const genre = matchPrefix(trimmed, PREFIX.genre)
      if (genre !== null) {
        result.genres = splitGenres(genre)
        continue
      }
      const year = matchPrefix(trimmed, PREFIX.year)
      if (year !== null) {
        const parsed = Number.parseInt(year, 10)
        result.year = Number.isFinite(parsed) && parsed > 0 ? parsed : null
        continue
      }
      const tracks = matchPrefix(trimmed, PREFIX.tracks)
      if (tracks !== null) {
        result.tracks = splitTracks(tracks)
        continue
      }
      const mv = matchPrefix(trimmed, PREFIX.mv)
      if (mv !== null) {
        result.mvUrl = mv || null
        continue
      }
      const background = matchPrefix(trimmed, PREFIX.background)
      if (background !== null) {
        result.backgroundImage = background || null
        continue
      }
      if (trimmed === '') continue
    }

    bodyLines.push(line)
  }

  result.contentHtml = bodyLines.join('\n').trim()
  return result
}

/** Remove the lead-track star used by the legacy editor. */
export function cleanTrackName(track: string): string {
  return track.replace(/[⭐★☆]/g, '').trim()
}

/** True when a track is flagged as the lead track. */
export function isLeadTrack(track: string): boolean {
  return /[⭐★]/.test(track)
}

/** Parse the free-form actors field (`"A，B, C"`) into a list. */
export function parsePeopleList(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(/[,，、/]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
