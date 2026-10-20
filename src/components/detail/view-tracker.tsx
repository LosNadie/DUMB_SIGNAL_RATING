'use client'

import { useEffect } from 'react'

const STORAGE_PREFIX = 'dumb_view_'
const DEDUPE_MS = 30 * 60 * 1000

/**
 * Fire-and-forget view counter. Replaces the old behaviour of writing to the
 * database on every GET (which broke caching and inflated counts on refresh).
 */
export function ViewTracker({ type, id }: { type: 'review' | 'anime' | 'movie'; id: number }) {
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${type}_${id}`
    try {
      const last = Number(window.localStorage.getItem(key) ?? 0)
      if (Date.now() - last < DEDUPE_MS) return
      window.localStorage.setItem(key, String(Date.now()))
    } catch {
      // Private mode: still count the view, just without deduplication.
    }

    const payload = JSON.stringify({ type, id })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/views', new Blob([payload], { type: 'application/json' }))
    } else {
      void fetch('/api/views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => undefined)
    }
  }, [type, id])

  return null
}
