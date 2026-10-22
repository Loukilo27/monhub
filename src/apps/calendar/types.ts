/** Ligne de la table events (mêmes noms de colonnes qu'en base). */
export interface CalendarEvent {
  id: string
  title: string
  description: string
  location: string
  color: string
  all_day: boolean
  start_at: string
  end_at: string
  recurrence_rule: string | null
  exception_dates: string[]
  /** Rappels X minutes avant (plusieurs possibles). */
  reminder_offsets: number[]
}

export const EVENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b']

export const EVENT_REMINDER_CHOICES = [
  { value: 0, label: 'À l’heure de début' },
  { value: 5, label: '5 min avant' },
  { value: 10, label: '10 min avant' },
  { value: 15, label: '15 min avant' },
  { value: 30, label: '30 min avant' },
  { value: 60, label: '1 h avant' },
  { value: 120, label: '2 h avant' },
  { value: 1440, label: '1 jour avant' },
  { value: 2880, label: '2 jours avant' },
  { value: 10080, label: '1 semaine avant' },
]

export function describeOffset(minutes: number): string {
  return EVENT_REMINDER_CHOICES.find((choice) => choice.value === minutes)?.label ?? `${minutes} min avant`
}
