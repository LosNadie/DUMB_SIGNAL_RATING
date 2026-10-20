'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { resolveImageUrl } from '@/lib/images'
import type { FeaturedContent } from '@/lib/data/home'

const ROTATION_MS = 4000

export function FeaturedCarousel({ items }: { items: FeaturedContent[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reducedMotion = useRef(false)

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (items.length <= 1 || paused || reducedMotion.current) return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      setIndex((value) => (value + 1) % items.length)
    }, ROTATION_MS)
    return () => window.clearInterval(timer)
  }, [items.length, paused])

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center border border-signal-border bg-signal-panel">
        <p className="text-xs uppercase tracking-[0.2em] text-signal-dim">等待新的信号</p>
      </div>
    )
  }

  const active = items[index]

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <Link
        href={active.path}
        className="group relative block aspect-[16/10] overflow-hidden border border-signal-border bg-signal-panel"
        aria-label={`${active.category} · ${active.title}`}
      >
        {items.map((item, itemIndex) => (
          <Image
            key={`${item.category}-${item.id}`}
            src={resolveImageUrl(item.imageUrl)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            priority={itemIndex === 0}
            className={`object-cover transition-opacity duration-700 ${
              itemIndex === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
          <p className="mb-2 text-[0.64rem] uppercase tracking-[0.26em] text-white/60">
            {active.category} / FEATURED
          </p>
          <h2 className="font-display text-2xl leading-tight text-white transition-colors group-hover:text-neutral-200 md:text-3xl">
            {active.title}
          </h2>
          <p className="mt-1.5 text-sm text-white/60">{active.meta}</p>
        </div>
      </Link>

      {items.length > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5" role="tablist" aria-label="精选内容">
            {items.map((item, itemIndex) => (
              <button
                key={`${item.category}-${item.id}-dot`}
                type="button"
                role="tab"
                aria-selected={itemIndex === index}
                aria-label={`${item.category} ${item.title}`}
                onClick={() => setIndex(itemIndex)}
                className={`h-px w-8 transition-colors ${
                  itemIndex === index ? 'bg-white' : 'bg-neutral-700 hover:bg-neutral-500'
                }`}
              />
            ))}
          </div>
          <span className="text-[0.62rem] tabular-nums tracking-[0.18em] text-signal-dim">
            {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
          </span>
        </div>
      )}
    </div>
  )
}
