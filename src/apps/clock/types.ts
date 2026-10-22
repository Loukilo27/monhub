/** Lignes des tables de l'Horloge (mêmes noms de colonnes qu'en base). */

export interface WorldClock {
  id: string
  time_zone: string
  label: string
  position: number
}

export interface Alarm {
  id: string
  /** « HH:MM » */
  time: string
  label: string
  /** Jours ISO (1 = lundi … 7 = dimanche) ; vide = une seule fois. */
  days: number[]
  sound: string
  snooze_minutes: number
  enabled: boolean
}

export type TimerState = 'idle' | 'running' | 'paused' | 'finished'

export interface Timer {
  id: string
  label: string
  duration_seconds: number
  state: TimerState
  ends_at: string | null
  remaining_seconds: number | null
}
