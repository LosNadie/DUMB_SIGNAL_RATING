import http from './http'
import type { AnimeAiGenerateResponse, ApiResult, AnimeItem, AuthResponse, CommentItem, MovieAiGenerateResponse, MovieItem, ReviewAiGenerateResponse, ReviewItem } from '../types/models'

export const authApi = {
  login(payload: { username: string; password: string }) {
    return http.post<any, ApiResult<AuthResponse>>('/auth/login', payload)
  },
  register(payload: { username: string; password: string; email: string }) {
    return http.post<any, ApiResult<AuthResponse>>('/auth/register', payload)
  },
}

export const reviewApi = {
  list(params?: Record<string, string | number>, options?: { signal?: AbortSignal }) {
    return http.get<any, ApiResult<ReviewItem[]>>('/reviews', { params, signal: options?.signal })
  },
  detail(id: number) {
    return http.get<any, ApiResult<any>>(`/reviews/${id}`)
  },
  create(payload: Record<string, unknown>) {
    return http.post<any, ApiResult<any>>('/admin/reviews', payload)
  },
  adminList(params?: Record<string, string | number>) {
    return http.get<any, ApiResult<ReviewItem[]>>('/admin/reviews', { params })
  },
  adminDetail(id: number) {
    return http.get<any, ApiResult<any>>(`/admin/reviews/${id}`)
  },
  update(id: number, payload: Record<string, unknown>) {
    return http.put<any, ApiResult<any>>(`/admin/reviews/${id}`, payload)
  },
  remove(id: number) {
    return http.delete<any, ApiResult<any>>(`/admin/reviews/${id}`)
  },
  aiGenerate(payload: { artist: string; albumTitle: string; year: string }) {
    return http.post<any, ApiResult<ReviewAiGenerateResponse>>('/admin/reviews/ai-generate', payload, {
      timeout: 120000,
    })
  },
}

export const animeApi = {
  list(options?: { signal?: AbortSignal }) {
    return http.get<any, ApiResult<AnimeItem[]>>('/anime', { signal: options?.signal })
  },
  detail(id: number) {
    return http.get<any, ApiResult<AnimeItem>>(`/anime/${id}`)
  },
  create(payload: Record<string, unknown>) {
    return http.post<any, ApiResult<any>>('/admin/anime', payload)
  },
  adminList(params?: Record<string, string | number>) {
    return http.get<any, ApiResult<AnimeItem[]>>('/admin/anime', { params })
  },
  adminDetail(id: number) {
    return http.get<any, ApiResult<any>>(`/admin/anime/${id}`)
  },
  update(id: number, payload: Record<string, unknown>) {
    return http.put<any, ApiResult<any>>(`/admin/anime/${id}`, payload)
  },
  remove(id: number) {
    return http.delete<any, ApiResult<any>>(`/admin/anime/${id}`)
  },
  aiGenerate(payload: { title: string }) {
    return http.post<any, ApiResult<AnimeAiGenerateResponse>>('/admin/anime/ai-generate', payload, {
      timeout: 120000,
    })
  },
}

export const movieApi = {
  list(params?: Record<string, string | number>, options?: { signal?: AbortSignal }) {
    return http.get<any, ApiResult<MovieItem[]>>('/movie', { params, signal: options?.signal })
  },
  detail(id: number) {
    return http.get<any, ApiResult<MovieItem>>(`/movie/${id}`)
  },
  create(payload: Record<string, unknown>) {
    return http.post<any, ApiResult<any>>('/admin/movie', payload)
  },
  adminList(params?: Record<string, string | number>) {
    return http.get<any, ApiResult<MovieItem[]>>('/admin/movie', { params })
  },
  adminDetail(id: number) {
    return http.get<any, ApiResult<any>>(`/admin/movie/${id}`)
  },
  update(id: number, payload: Record<string, unknown>) {
    return http.put<any, ApiResult<any>>(`/admin/movie/${id}`, payload)
  },
  remove(id: number) {
    return http.delete<any, ApiResult<any>>(`/admin/movie/${id}`)
  },
  aiGenerate(payload: { title: string }) {
    return http.post<any, ApiResult<MovieAiGenerateResponse>>('/admin/movie/ai-generate', payload, {
      timeout: 120000,
    })
  },
}

export const commentApi = {
  list(contentType: string, contentId: number) {
    return http.get<any, ApiResult<CommentItem[]>>('/comments', { params: { contentType, contentId } })
  },
  create(payload: Record<string, unknown>) {
    return http.post<any, ApiResult<CommentItem>>('/comments', payload)
  },
  remove(id: number) {
    return http.delete<any, ApiResult<any>>(`/comments/${id}`)
  },
}
