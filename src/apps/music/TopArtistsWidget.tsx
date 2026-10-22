import { UserRound } from 'lucide-react'
import type { WidgetProps } from '../types'
import { useTop } from './api'

/** Widget Top artistes du mois (2×2, 4×2). */
export default function TopArtistsWidget({ size }: WidgetProps) {
  const { data, error } = useTop('month')
  const artists = (data?.artists ?? []).slice(0, size.w >= 4 ? 5 : 4)

  return (
    <div className="flex h-full flex-col p-3">
      <p className="mb-2 text-sm font-semibold">Top artistes · {data?.label ?? 'ce mois-ci'}</p>
      {error ? (
        <p className="grid flex-1 place-items-center text-sm text-muted">Last.fm indisponible</p>
      ) : artists.length === 0 ? (
        <p className="grid flex-1 place-items-center text-sm text-muted">{data ? 'Aucune écoute ce mois-ci' : 'Chargement…'}</p>
      ) : (
        <ol className={`min-h-0 flex-1 ${size.w >= 4 ? 'grid grid-cols-5 gap-2' : 'space-y-1.5 overflow-hidden'}`}>
          {artists.map((artist, index) =>
            size.w >= 4 ? (
              <li key={artist.name} className="flex min-w-0 flex-col items-center gap-1 text-center">
                {artist.image ? (
                  <img src={artist.image} alt="" className="aspect-square w-full max-w-20 rounded-full object-cover" />
                ) : (
                  <span className="grid aspect-square w-full max-w-20 place-items-center rounded-full bg-surface-2">
                    <UserRound aria-hidden className="size-1/2 text-muted" />
                  </span>
                )}
                <span className="w-full truncate text-xs font-medium">{artist.name}</span>
                <span className="text-[11px] text-muted">{artist.plays}</span>
              </li>
            ) : (
              <li key={artist.name} className="flex items-center gap-2">
                <span className="w-3 text-xs text-muted">{index + 1}</span>
                {artist.image ? (
                  <img src={artist.image} alt="" className="size-7 rounded-full object-cover" />
                ) : (
                  <span className="size-7 rounded-full bg-surface-2" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{artist.name}</span>
                <span className="text-xs text-muted tabular-nums">{artist.plays}</span>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  )
}
