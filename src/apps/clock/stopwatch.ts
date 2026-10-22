import { useSyncExternalStore } from 'react'

/**
 * Chronomètre : état fait de timestamps, conservé dans le navigateur. Il « continue de tourner »
 * pendant qu'on change de page ou qu'on ferme l'onglet, car le temps est recalculé à l'affichage.
 */
export interface StopwatchState {
  /** Début de la période en cours (ms), null si en pause / arrêté. */
  startedAt: number | null
  /** Temps cumulé des périodes précédentes (ms). */
  accumulated: number
  /** Temps total au moment de chaque tour (ms), dans l'ordre. */
  laps: number[]
}

export const INITIAL_STOPWATCH: StopwatchState = { startedAt: null, accumulated: 0, laps: [] }

export function elapsed(state: StopwatchState, now: number): number {
  return state.accumulated + (state.startedAt === null ? 0 : now - state.startedAt)
}

export function startStopwatch(state: StopwatchState, now: number): StopwatchState {
  return state.startedAt === null ? { ...state, startedAt: now } : state
}

export function pauseStopwatch(state: StopwatchState, now: number): StopwatchState {
  return state.startedAt === null ? state : { ...state, startedAt: null, accumulated: elapsed(state, now) }
}

export function addLap(state: StopwatchState, now: number): StopwatchState {
  return { ...state, laps: [...state.laps, elapsed(state, now)] }
}

export interface LapRow {
  index: number
  /** Durée du tour seul. */
  split: number
  /** Temps total au tour. */
  total: number
  best: boolean
  worst: boolean
}

/** Tours avec leur durée propre, le meilleur et le pire marqués (à partir de 2 tours). */
export function lapRows(laps: number[]): LapRow[] {
  const splits = laps.map((total, index) => total - (index ? laps[index - 1] : 0))
  const min = Math.min(...splits)
  const max = Math.max(...splits)
  const marked = splits.length >= 2 && min !== max
  return splits.map((split, index) => ({
    index: index + 1,
    split,
    total: laps[index],
    best: marked && split === min,
    worst: marked && split === max,
  }))
}

/** « 01:23,45 » ou « 1:01:23,45 » (centièmes). */
export function formatStopwatch(ms: number): string {
  const centis = Math.floor(ms / 10) % 100
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${h ? `${h}:` : ''}${pad(m)}:${pad(s)},${pad(centis)}`
}

// ---------- Stockage (localStorage), partagé entre les composants et les onglets ----------

const KEY = 'monhub.stopwatch'
const listeners = new Set<() => void>()
let cache: StopwatchState | null = null

function load(): StopwatchState {
  if (cache) return cache
  try {
    cache = { ...INITIAL_STOPWATCH, ...JSON.parse(localStorage.getItem(KEY) ?? 'null') }
  } catch {
    cache = INITIAL_STOPWATCH
  }
  return cache!
}

export function setStopwatch(next: StopwatchState) {
  cache = next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Stockage indisponible : l'état vaut pour la session.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    cache = null
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useStopwatch(): StopwatchState {
  return useSyncExternalStore(subscribe, load, () => INITIAL_STOPWATCH)
}
