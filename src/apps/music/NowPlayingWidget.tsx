import { Music2 } from 'lucide-react'
import type { WidgetProps } from '../types'
import { useRecent } from './api'
import { Equalizer } from './Equalizer'

/** Widget En écoute (2×1, 4×1, 4×2) : titre en cours, sinon la dernière écoute. */
export default function NowPlayingWidget({ size }: WidgetProps) {
  const { data, error } = useRecent()
  const track = data?.nowPlaying ?? data?.recent[0]
  const large = size.h >= 2

  if (error || !track) {
    return (
      <div className="flex h-full items-center gap-3 px-4 text-sm text-muted">
        <Music2 aria-hidden className="size-6 shrink-0" />
        {error ? 'Last.fm indisponible' : 'Aucune écoute'}
      </div>
    )
  }

  return (
    <div className={`flex h-full items-center gap-3 ${large ? 'p-4' : 'px-3'}`}>
      {track.image ? (
        <img src={track.image} alt="" className={`${large ? 'size-[min(7rem,70cqh)]' : 'size-[70cqh]'} shrink-0 rounded-xl object-cover shadow-soft`} />
      ) : (
        <span className="grid size-[70cqh] shrink-0 place-items-center rounded-xl bg-surface-2">
          <Music2 aria-hidden className="size-1/2 text-muted" />
        </span>
      )}
      <div className="min-w-0">
        <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-accent uppercase">
          {data?.nowPlaying ? (
            <>
              <Equalizer /> En écoute
            </>
          ) : (
            <span className="text-muted">Dernière écoute</span>
          )}
        </p>
        <p className={`truncate font-semibold ${large ? 'text-lg' : 'text-sm'}`}>{track.name}</p>
        <p className="truncate text-xs text-muted">{track.artist}</p>
      </div>
    </div>
  )
}
