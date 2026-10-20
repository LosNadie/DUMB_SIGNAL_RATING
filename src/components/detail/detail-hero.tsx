import Image from 'next/image'

import { resolveImageUrl } from '@/lib/images'

export interface DetailHeroProps {
  title: string
  subtitle?: string
  eyebrow: string
  score: number | string
  imageUrl?: string | null
  backgroundImage?: string | null
  facts: { label: string; value: string }[]
  genres?: string[]
  children?: React.ReactNode
}

function formatScore(score: number | string): string {
  const value = Number(score)
  return Number.isFinite(value) ? value.toFixed(1) : '—'
}

export function DetailHero({
  title,
  subtitle,
  eyebrow,
  score,
  imageUrl,
  backgroundImage,
  facts,
  genres,
  children,
}: DetailHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-signal-border">
      {backgroundImage && (
        <div className="absolute inset-0 -z-10">
          <Image
            src={resolveImageUrl(backgroundImage)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-25 blur-[2px]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black" />
        </div>
      )}

      <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-12 md:px-8 md:pb-16 md:pt-16">
        <p className="mb-6 text-[0.66rem] uppercase tracking-[0.26em] text-signal-muted">{eyebrow}</p>

        <div className="flex flex-col gap-8 md:flex-row md:gap-12">
          <div className="relative mx-auto w-52 shrink-0 sm:w-60 md:mx-0">
            <div className="relative aspect-[3/4] overflow-hidden border border-signal-border bg-signal-panel">
              <Image
                src={resolveImageUrl(imageUrl)}
                alt={title}
                fill
                sizes="(max-width: 768px) 60vw, 240px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
              {title}
            </h1>
            {subtitle && <p className="mt-3 text-base text-signal-muted md:text-lg">{subtitle}</p>}

            <div className="mt-6 flex items-end gap-6">
              <div>
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-signal-dim">SCORE</p>
                <p className="font-display text-4xl leading-none text-white md:text-5xl">
                  {formatScore(score)}
                </p>
              </div>
              {genres && genres.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 pb-1">
                  {genres.map((genre) => (
                    <li
                      key={genre}
                      className="border border-signal-border px-2 py-0.5 text-[0.66rem] uppercase tracking-[0.1em] text-signal-muted"
                    >
                      {genre}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {facts.length > 0 && (
              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-signal-border pt-5 text-sm sm:grid-cols-3">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-[0.62rem] uppercase tracking-[0.18em] text-signal-dim">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-signal-fg/90">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
