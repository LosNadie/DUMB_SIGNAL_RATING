import type { Component } from 'vue'

export type CatalogRouteSection = 'music' | 'anime' | 'movie'

type RouteModule = { default: Component }

export function createCatalogRouteLoader<T>(loader: () => Promise<T>) {
  let request: Promise<T> | null = null

  return () => {
    if (!request) {
      request = loader().catch((error) => {
        request = null
        throw error
      })
    }
    return request
  }
}

const detailRouteLoaders: Record<CatalogRouteSection, () => Promise<RouteModule>> = {
  music: createCatalogRouteLoader(() => import('../views/ReviewDetailView.vue')),
  anime: createCatalogRouteLoader(() => import('../views/AnimeDetailView.vue')),
  movie: createCatalogRouteLoader(() => import('../views/MovieDetailView.vue')),
}

export function loadCatalogDetailRoute(section: CatalogRouteSection) {
  return detailRouteLoaders[section]()
}

export async function preloadCatalogDetailRoute(section: CatalogRouteSection) {
  await loadCatalogDetailRoute(section)
}

export const catalogDetailRouteComponents = {
  music: () => loadCatalogDetailRoute('music'),
  anime: () => loadCatalogDetailRoute('anime'),
  movie: () => loadCatalogDetailRoute('movie'),
}
