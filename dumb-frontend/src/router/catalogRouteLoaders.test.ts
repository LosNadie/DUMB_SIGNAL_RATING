import { describe, expect, it, vi } from 'vitest'
import { createCatalogRouteLoader } from './catalogRouteLoaders'

describe('catalog route loader', () => {
  it('deduplicates component requests', async () => {
    const importer = vi.fn(async () => ({ default: { name: 'DetailView' } }))
    const load = createCatalogRouteLoader(importer)

    const [first, second] = await Promise.all([load(), load()])

    expect(first).toBe(second)
    expect(importer).toHaveBeenCalledTimes(1)
  })

  it('allows a retry after a failed component request', async () => {
    const importer = vi.fn()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValueOnce({ default: { name: 'DetailView' } })
    const load = createCatalogRouteLoader(importer)

    await expect(load()).rejects.toThrow('chunk failed')
    await expect(load()).resolves.toEqual({ default: { name: 'DetailView' } })
    expect(importer).toHaveBeenCalledTimes(2)
  })
})
