import 'server-only'

export interface AniListAnimeContext {
  title: string
  titles: string[]
  coverImage: string | null
  bannerImage: string | null
  studio: string | null
  genres: string[]
  releaseDate: string | null
  averageScore: number | null
  description: string | null
}

const ANILIST_URL = 'https://graphql.anilist.co'

const QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    title { native romaji english }
    coverImage { large extraLarge }
    bannerImage
    studios { nodes { name } }
    genres
    startDate { year month day }
    averageScore
    description
  }
}
`

interface AniListResponse {
  data?: {
    Media?: {
      title?: { native?: string; romaji?: string; english?: string }
      coverImage?: { large?: string; extraLarge?: string }
      bannerImage?: string
      studios?: { nodes?: { name?: string }[] }
      genres?: string[]
      startDate?: { year?: number; month?: number; day?: number }
      averageScore?: number
      description?: string
    }
  }
  errors?: { message?: string }[]
}

function formatDate(startDate?: { year?: number; month?: number; day?: number }): string | null {
  if (!startDate?.year) return null
  const month = String(startDate.month ?? 1).padStart(2, '0')
  const day = String(startDate.day ?? 1).padStart(2, '0')
  return `${startDate.year}-${month}-${day}`
}

export async function findAnime(search: string): Promise<AniListAnimeContext | null> {
  const term = search.trim()
  if (!term) return null

  let payload: AniListResponse
  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { search: term } }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) return null
    payload = (await response.json()) as AniListResponse
  } catch {
    return null
  }

  if (payload.errors?.length) return null
  const media = payload.data?.Media
  if (!media) return null

  const titles = [media.title?.native, media.title?.romaji, media.title?.english].filter(
    (value): value is string => Boolean(value),
  )

  return {
    title: titles[0] ?? term,
    titles,
    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
    bannerImage: media.bannerImage ?? null,
    studio: media.studios?.nodes?.[0]?.name ?? null,
    genres: media.genres ?? [],
    releaseDate: formatDate(media.startDate),
    averageScore: typeof media.averageScore === 'number' ? media.averageScore : null,
    description: media.description ?? null,
  }
}
