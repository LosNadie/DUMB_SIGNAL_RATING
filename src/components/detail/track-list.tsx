import { cleanTrackName, isLeadTrack } from '@/lib/legacy-content'

export function TrackList({ tracks, mvUrl }: { tracks: string[]; mvUrl?: string | null }) {
  if (!tracks.length && !mvUrl) return null

  return (
    <section aria-labelledby="tracks-heading" className="mt-12 border-t border-signal-border pt-8">
      <div className="flex items-baseline justify-between">
        <h2 id="tracks-heading" className="text-[0.68rem] uppercase tracking-[0.24em] text-signal-muted">
          曲目
        </h2>
        {mvUrl && (
          <a
            href={mvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.68rem] uppercase tracking-[0.18em] text-signal-dim underline underline-offset-4 transition-colors hover:text-white"
          >
            观看 MV ↗
          </a>
        )}
      </div>

      <ol className="mt-5 grid gap-x-8 gap-y-0 sm:grid-cols-2">
        {tracks.map((track, index) => (
          <li
            key={`${track}-${index}`}
            className="flex items-baseline gap-4 border-b border-signal-border/60 py-2.5 text-sm"
          >
            <span className="w-6 shrink-0 text-right text-[0.68rem] tabular-nums text-signal-dim">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className={isLeadTrack(track) ? 'text-white' : 'text-signal-fg/80'}>
              {cleanTrackName(track)}
            </span>
            {isLeadTrack(track) && (
              <span className="ml-auto text-[0.6rem] uppercase tracking-[0.16em] text-signal-dim">
                lead
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
