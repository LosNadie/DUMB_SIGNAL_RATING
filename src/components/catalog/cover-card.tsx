import Image from 'next/image'
import Link from 'next/link'

import { resolveImageUrl } from '@/lib/images'

export interface CoverCardProps {
  href: string
  title: string
  meta: string
  imageUrl: string | null | undefined
  score: number | string
  eyebrow?: string
  genres?: string[]
  priority?: boolean
}

function formatScore(score: number | string): string {
  const value = Number(score)
  return Number.isFinite(value) ? value.toFixed(1) : '—'
}

export function CoverCard({
  href,
  title,
  meta,
  imageUrl,
  score,
  eyebrow,
  genres,
  priority = false,
}: CoverCardProps) {
  return (
    <article className="group">
      <Link href={href} className="block focus-visible:outline-none">
        <div className="relative aspect-[3/4] overflow-hidden border border-signal-border bg-signal-panel transition-colors duration-300 group-hover:border-white/70 group-focus-visible:border-white">
          <Image
            src={resolveImageUrl(imageUrl)}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <span className="absolute right-2 top-2 border border-white/25 bg-black/70 px-1.5 py-0.5 text-[0.7rem] font-medium tabular-nums text-white backdrop-blur-sm">
            {formatScore(score)}
          </span>
        </div>

        <div className="mt-3">
          {eyebrow && (
            <p className="mb-1 text-[0.62rem] uppercase tracking-[0.2em] text-signal-dim">{eyebrow}</p>
          )}
          <h3 className="line-clamp-2 font-display text-[1.02rem] leading-snug text-white transition-colors group-hover:text-neutral-300">
            {title}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-signal-muted">{meta}</p>
          {genres && genres.length > 0 && (
            <p className="mt-1.5 line-clamp-1 text-[0.68rem] uppercase tracking-[0.12em] text-signal-dim">
              {genres.slice(0, 3).join(' · ')}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}
