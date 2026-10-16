export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface AuthResponse {
  token: string
  username: string
  role: string
}

export interface ReviewAiGenerateResponse {
  year?: string
  tracks?: string
  description?: string
  coverImage?: string
  rawAlbumMeta?: Record<string, unknown>
}

export interface AnimeAiGenerateResponse {
  title?: string
  content?: string
  score?: number
  studio?: string
  genres?: string[]
  releaseDate?: string
  coverImage?: string
  backgroundImage?: string
}

export interface MovieAiGenerateResponse {
  title?: string
  content?: string
  score?: number
  director?: string
  actors?: string
  genres?: string[]
  region?: string
  releaseDate?: string
  coverImage?: string
  backgroundImage?: string
}

export interface ReviewItem {
  id: number
  albumId: number
  title: string
  content?: string
  coverImage: string
  score: number
  authorName: string
  albumTitle: string
  artist: string
  genre: string
  releaseDate: string
  publishTime: string
  updateTime?: string
}

export interface AnimeItem {
  id: number
  title: string
  content: string
  coverImage: string
  backgroundImage?: string
  score: number
  studio: string
  genre?: string
  releaseDate?: string
  publishTime: string
  updateTime?: string
  views: number
}

export interface MovieItem {
  id: number
  title: string
  content: string
  coverImage: string
  backgroundImage?: string
  score: number
  director: string
  actors: string
  genre?: string
  region?: string
  releaseDate?: string
  publishTime: string
  updateTime?: string
  views: number
}

export interface CommentItem {
  id: number
  contentType: string
  contentId: number
  userId: number
  username?: string
  content: string
  score?: number
  parentId?: number
  createTime: string
}
