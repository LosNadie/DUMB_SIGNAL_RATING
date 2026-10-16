import { describe, expect, it, vi } from 'vitest'
import {
  catalogTransitionState,
  consumeCatalogReverseOrigin,
  getCatalogSession,
  loadCachedDetail,
  navigateToCatalogDetail,
  rememberCatalogReverseOrigin,
  updateCatalogSession,
} from './useCatalogTransition'

describe('catalog detail transition', () => {
  it('only enables a reverse cover transition for a catalog-origin detail route', () => {
    rememberCatalogReverseOrigin('/music/712')

    expect(consumeCatalogReverseOrigin('/anime/712')).toBe(false)
    expect(consumeCatalogReverseOrigin('/music/712')).toBe(true)
    expect(consumeCatalogReverseOrigin('/music/712')).toBe(false)
  })

  it('navigates to details without activating a cover transition', async () => {
    const push = vi.fn(async () => undefined)
    const item = {
      id: 712,
      imageUrl: '',
      title: 'Signal',
      eyebrow: 'MUSIC / 2026',
      metaLabel: 'ARTIST' as const,
      meta: 'Artist',
      score: '9.0',
      route: '/music/712',
    }

    await navigateToCatalogDetail({
      item,
      rect: { left: 420, top: 180, width: 260, height: 260 },
    }, { push } as never)

    expect(push).toHaveBeenCalledWith('/music/712')
    expect(catalogTransitionState.active).toBe(false)
    expect(catalogTransitionState.locked).toBe(false)
  })

  it('deduplicates detail requests while they are in flight', async () => {
    const loader = vi.fn(async () => ({ id: 712, title: 'Signal' }))
    const first = loadCachedDetail('test:dedupe:712', loader)
    const second = loadCachedDetail('test:dedupe:712', loader)

    await expect(first).resolves.toEqual({ id: 712, title: 'Signal' })
    await expect(second).resolves.toEqual({ id: 712, title: 'Signal' })
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('preserves catalog filters, sorting and active content', () => {
    updateCatalogSession('anime', {
      hasData: true,
      filters: { keyword: 'hope', year: '2026' },
      sortField: 'score',
      sortOrder: 'asc',
      activeId: 42,
    })

    expect(getCatalogSession('anime')).toMatchObject({
      hasData: true,
      filters: { keyword: 'hope', year: '2026' },
      sortField: 'score',
      sortOrder: 'asc',
      activeId: 42,
    })
  })
})
