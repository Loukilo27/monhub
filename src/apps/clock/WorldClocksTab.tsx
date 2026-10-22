import { ArrowDown, ArrowUp, Moon, Plus, Search, Sun, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from '../../components/IconButton'
import { inputBase, Modal } from '../../components/Modal'
import { useDeleteRows, useSaveRows } from '../../data/rows'
import { useNowMinute } from '../../lib/useNow'
import { useTimeZone, useWorldClocks } from './alarms'
import { searchCities } from './cities'
import type { WorldClock } from './types'
import { describeDay, describeOffset, formatZoneTime, isDaytime } from './worldClockInfo'

export function WorldClocksTab() {
  const now = useNowMinute()
  const home = useTimeZone()
  const clocks = useWorldClocks()
  const save = useSaveRows<WorldClock>('world_clocks')
  const remove = useDeleteRows('world_clocks')
  const [adding, setAdding] = useState(false)

  const move = (index: number, direction: -1 | 1) => {
    const reordered = [...clocks]
    const [item] = reordered.splice(index, 1)
    reordered.splice(index + direction, 0, item)
    save.mutate(reordered.map((clock, position) => ({ ...clock, position })))
  }

  return (
    <div className="space-y-3 py-2">
      <ul className="space-y-2">
        <li className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Ici · {home.split('/').pop()?.replace(/_/g, ' ')}</span>
            <span className="block text-sm text-muted">Fuseau de référence</span>
          </span>
          <span className="text-3xl font-light tabular-nums">{formatZoneTime(now, home)}</span>
        </li>
        {clocks.map((clock, index) => {
          const DayIcon = isDaytime(now, clock.time_zone) ? Sun : Moon
          return (
            <li key={clock.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft">
              <DayIcon
                aria-label={isDaytime(now, clock.time_zone) ? 'Jour' : 'Nuit'}
                className={`size-5 shrink-0 ${isDaytime(now, clock.time_zone) ? 'text-amber-500' : 'text-indigo-400'}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{clock.label}</span>
                <span className="block text-sm text-muted">
                  {describeDay(now, clock.time_zone, home)} · {describeOffset(now, clock.time_zone, home)}
                </span>
              </span>
              <span className="mr-1 text-3xl font-light tabular-nums">{formatZoneTime(now, clock.time_zone)}</span>
              <span className="flex flex-col">
                <IconButton label={`Monter ${clock.label}`} disabled={index === 0} onClick={() => move(index, -1)} className="size-8!">
                  <ArrowUp aria-hidden className="size-4" />
                </IconButton>
                <IconButton
                  label={`Descendre ${clock.label}`}
                  disabled={index === clocks.length - 1}
                  onClick={() => move(index, 1)}
                  className="size-8!"
                >
                  <ArrowDown aria-hidden className="size-4" />
                </IconButton>
              </span>
              <IconButton label={`Retirer ${clock.label}`} onClick={() => remove.mutate([clock.id])}>
                <Trash2 aria-hidden className="size-4" />
              </IconButton>
            </li>
          )
        })}
      </ul>
      {clocks.length === 0 && <p className="text-center text-sm text-muted">Ajoute des villes pour voir leur heure d’un coup d’œil.</p>}
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mx-auto flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 font-medium text-accent-contrast"
      >
        <Plus aria-hidden className="size-5" />
        Ajouter une ville
      </button>
      {adding && (
        <AddCityDialog
          onClose={() => setAdding(false)}
          onPick={(label, timeZone) => {
            save.mutate([{ id: crypto.randomUUID(), label, time_zone: timeZone, position: clocks.length }])
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function AddCityDialog({ onClose, onPick }: { onClose: () => void; onPick: (label: string, timeZone: string) => void }) {
  const [query, setQuery] = useState('')
  const now = useNowMinute()
  const results = searchCities(query)
  return (
    <Modal title="Ajouter une ville" onClose={onClose}>
      <label className="relative block">
        <span className="sr-only">Rechercher une ville ou un fuseau</span>
        <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-5 text-muted" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tokyo, New York…" className={`${inputBase} pl-10`} />
      </label>
      <ul className="mt-3 space-y-1">
        {results.map((city) => (
          <li key={`${city.label}-${city.timeZone}`}>
            <button
              type="button"
              onClick={() => onPick(city.label, city.timeZone)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{city.label}</span>
                <span className="block text-xs text-muted">{city.country}</span>
              </span>
              <span className="tabular-nums text-muted">{formatZoneTime(now, city.timeZone)}</span>
            </button>
          </li>
        ))}
        {results.length === 0 && <li className="py-6 text-center text-sm text-muted">Aucune ville trouvée.</li>}
      </ul>
    </Modal>
  )
}
