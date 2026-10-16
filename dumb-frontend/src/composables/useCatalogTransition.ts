import { nextTick, reactive } from 'vue'
import type { Router } from 'vue-router'
import { animeApi, movieApi, reviewApi } from '../api'
import { preloadCatalogDetailRoute } from '../router/catalogRouteLoaders'
import type {
  CatalogCoverRect,
  CatalogGalleryItem,
  CatalogOpenPayload,
} from '../components/catalog/catalogGallery'

export type CatalogSection = 'music' | 'anime' | 'movie'
export type CatalogTransitionDirection = 'forward' | 'reverse'
export type CatalogTransitionPhase = 'idle' | 'preparing' | 'waiting' | 'moving' | 'settling'

interface CatalogTransitionState {
  active: boolean
  locked: boolean
  direction: CatalogTransitionDirection | null
  phase: CatalogTransitionPhase
  item: CatalogGalleryItem | null
  fromRect: CatalogCoverRect | null
  targetRect: CatalogCoverRect | null
  targetVersion: number
  imageReady: boolean
  startedAt: number
  transitionId: number
}

export interface CatalogSessionSnapshot<T = unknown> {
  hasData: boolean
  data: T[]
  filters: Record<string, string>
  sortField: 'date' | 'score'
  sortOrder: 'desc' | 'asc'
  activeId: number | null
}

export const catalogTransitionState = reactive<CatalogTransitionState>({
  active: false,
  locked: false,
  direction: null,
  phase: 'idle',
  item: null,
  fromRect: null,
  targetRect: null,
  targetVersion: 0,
  imageReady: true,
  startedAt: 0,
  transitionId: 0,
})

const detailCache = new Map<string, unknown>()
const detailRequests = new Map<string, Promise<unknown>>()
const rememberedItems = new Map<string, CatalogGalleryItem>()
const detailCoverSources = new Map<string, { item: CatalogGalleryItem; rect: CatalogCoverRect }>()
const sessions = new Map<CatalogSection, CatalogSessionSnapshot>()
let transitionTimeout: number | null = null
let catalogReverseOrigin: string | null = null

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clearTransitionTimeout() {
  if (transitionTimeout !== null) window.clearTimeout(transitionTimeout)
  transitionTimeout = null
}

function armTransitionTimeout() {
  clearTransitionTimeout()
  const transitionId = catalogTransitionState.transitionId
  transitionTimeout = window.setTimeout(() => finishCatalogTransition(transitionId), 2400)
}

function detailKey(section: CatalogSection, id: number) {
  return `${section}:${id}`
}

function itemSection(item: CatalogGalleryItem): CatalogSection | null {
  const match = /^\/(music|anime|movie)\//.exec(item.route)
  return (match?.[1] as CatalogSection | undefined) ?? null
}

async function preloadImage(url: string) {
  if (!url) return false
  return new Promise<boolean>((resolve) => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = url
    if (image.complete) resolve(image.naturalWidth > 0)
  })
}

export function getCatalogSession<T>(section: CatalogSection): CatalogSessionSnapshot<T> {
  const existing = sessions.get(section)
  if (existing) return existing as CatalogSessionSnapshot<T>
  const created: CatalogSessionSnapshot<T> = {
    hasData: false,
    data: [],
    filters: {},
    sortField: 'date',
    sortOrder: 'desc',
    activeId: null,
  }
  sessions.set(section, created as CatalogSessionSnapshot)
  return created
}

export function updateCatalogSession<T>(
  section: CatalogSection,
  patch: Partial<CatalogSessionSnapshot<T>>,
) {
  const session = getCatalogSession<T>(section)
  Object.assign(session, patch)
}

export async function loadCachedDetail<T>(key: string, loader: () => Promise<T>) {
  if (detailCache.has(key)) return detailCache.get(key) as T
  const pending = detailRequests.get(key)
  if (pending) return pending as Promise<T>
  const request = loader()
    .then((value) => {
      detailCache.set(key, value)
      detailRequests.delete(key)
      return value
    })
    .catch((error) => {
      detailRequests.delete(key)
      throw error
    })
  detailRequests.set(key, request)
  return request
}

export function loadCatalogDetail<T>(section: CatalogSection, id: number) {
  return loadCachedDetail<T>(detailKey(section, id), async () => {
    if (section === 'music') return (await reviewApi.detail(id)).data as T
    if (section === 'anime') return (await animeApi.detail(id)).data as T
    return (await movieApi.detail(id)).data as T
  })
}

export function prefetchCatalogDetail(item: CatalogGalleryItem) {
  const section = itemSection(item)
  if (!section) return Promise.resolve(null)
  void preloadCatalogDetailRoute(section).catch(() => undefined)
  return loadCatalogDetail(section, item.id).catch(() => null)
}

export function rememberCatalogItem(item: CatalogGalleryItem) {
  rememberedItems.set(item.route, item)
}

export function getRememberedCatalogItem(route: string) {
  return rememberedItems.get(route) ?? null
}

export function rememberCatalogReverseOrigin(route: string) {
  catalogReverseOrigin = route
}

export function consumeCatalogReverseOrigin(route: string) {
  if (catalogReverseOrigin !== route) return false
  catalogReverseOrigin = null
  return true
}

export function clearCatalogReverseOrigin(route?: string) {
  if (!route || catalogReverseOrigin === route) catalogReverseOrigin = null
}

function beginTransition(
  direction: CatalogTransitionDirection,
  item: CatalogGalleryItem,
  rect: CatalogCoverRect,
  imageReady: boolean,
) {
  clearTransitionTimeout()
  catalogTransitionState.active = true
  catalogTransitionState.locked = true
  catalogTransitionState.direction = direction
  catalogTransitionState.phase = 'waiting'
  catalogTransitionState.item = item
  catalogTransitionState.fromRect = { ...rect }
  catalogTransitionState.targetRect = null
  catalogTransitionState.imageReady = imageReady
  catalogTransitionState.startedAt = performance.now()
  catalogTransitionState.transitionId += 1
  rememberCatalogItem(item)
}

export async function navigateToCatalogDetail(payload: CatalogOpenPayload, router: Router) {
  finishCatalogTransition()
  clearCatalogReverseOrigin()
  rememberCatalogItem(payload.item)
  void prefetchCatalogDetail(payload.item)
  await router.push(payload.item.route)
}

export async function prepareCatalogReverse(item: CatalogGalleryItem, rect: CatalogCoverRect) {
  if (catalogTransitionState.locked || prefersReducedMotion()) return
  catalogTransitionState.locked = true
  catalogTransitionState.direction = 'reverse'
  catalogTransitionState.phase = 'preparing'
  try {
    const imageReady = await preloadImage(item.imageUrl)
    beginTransition('reverse', item, rect, imageReady)
    await nextTick()
    await nextFrame()
    armTransitionTimeout()
  } catch (error) {
    finishCatalogTransition()
    throw error
  }
}

export async function prepareRememberedCatalogReverse(route: string) {
  if (!consumeCatalogReverseOrigin(route)) return
  if (catalogTransitionState.active) finishCatalogTransition()
  const remembered = detailCoverSources.get(route)
  const item = remembered?.item ?? rememberedItems.get(route)
  if (!item) return
  const element = document.querySelector<HTMLElement>('.hero-cover, .cover-box')
  const bounds = element?.getBoundingClientRect()
  const rect = bounds && bounds.width > 0 && bounds.height > 0
    ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }
    : remembered?.rect
  if (!rect) return
  await prepareCatalogReverse(item, rect)
}

export function registerCatalogTransitionTarget(
  role: 'catalog' | 'detail',
  item: CatalogGalleryItem,
  rect: CatalogCoverRect,
) {
  if (role === 'detail') {
    detailCoverSources.set(item.route, { item, rect: { ...rect } })
    rememberCatalogItem(item)
  }
  if (!catalogTransitionState.active || catalogTransitionState.item?.route !== item.route) return
  const expectedRole = catalogTransitionState.direction === 'forward' ? 'detail' : 'catalog'
  if (role !== expectedRole || rect.width <= 0 || rect.height <= 0) return
  if (catalogTransitionState.phase === 'moving' || catalogTransitionState.phase === 'settling') return
  catalogTransitionState.targetRect = { ...rect }
  catalogTransitionState.phase = 'moving'
  catalogTransitionState.targetVersion += 1
}

export function finishCatalogTransition(expectedTransitionId?: number) {
  if (
    expectedTransitionId !== undefined
      && catalogTransitionState.transitionId !== expectedTransitionId
  ) return
  clearTransitionTimeout()
  catalogTransitionState.active = false
  catalogTransitionState.locked = false
  catalogTransitionState.direction = null
  catalogTransitionState.phase = 'idle'
  catalogTransitionState.item = null
  catalogTransitionState.fromRect = null
  catalogTransitionState.targetRect = null
  catalogTransitionState.imageReady = true
  catalogTransitionState.startedAt = 0
}
