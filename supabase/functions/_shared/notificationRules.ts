// Règles d'envoi des notifications. Code pur, sans dépendance Deno : testé par Vitest
// (notificationRules.test.ts) et utilisé par les Edge Functions.

export interface QuietHours {
  enabled: boolean
  /** « HH:MM », heure locale. */
  start: string
  end: string
}

export interface NotificationPreferences {
  /** Mini-applis dont les notifications push sont coupées. */
  disabledApps?: string[]
  quietHours?: QuietHours
}

export interface ReminderLike {
  source: string
  kind: string
  send_at: string
}

function minutesOfDay(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

/** Heure locale (en minutes depuis minuit) dans le fuseau donné. */
export function localMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', timeZone }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

/** Vrai si `date` tombe dans la plage « Ne pas déranger » (qui peut passer minuit, ex. 22:00 → 07:00). */
export function isInQuietHours(date: Date, timeZone: string, quietHours: QuietHours | undefined): boolean {
  if (!quietHours?.enabled) return false
  const now = localMinutes(date, timeZone)
  const start = minutesOfDay(quietHours.start)
  const end = minutesOfDay(quietHours.end)
  if (start === end) return false
  return start < end ? now >= start && now < end : now >= start || now < end
}

/** Au-delà de ce retard (projet en pause, panne…), le rappel va dans l'historique sans push. */
export const MAX_PUSH_DELAY_MS = 6 * 60 * 60 * 1000

/**
 * Faut-il envoyer une notification push pour ce rappel ?
 * Les alarmes et minuteurs passent outre « Ne pas déranger », comme sur un téléphone.
 */
export function shouldPush(reminder: ReminderLike, prefs: NotificationPreferences, now: Date, timeZone: string): boolean {
  if (prefs.disabledApps?.includes(reminder.source)) return false
  if (now.getTime() - new Date(reminder.send_at).getTime() > MAX_PUSH_DELAY_MS) return false
  if (reminder.kind === 'alarm' || reminder.kind === 'timer') return true
  return !isInQuietHours(now, timeZone, prefs.quietHours)
}

export const ACTION_LABELS: Record<string, string> = {
  snooze: 'Reporter 10 min',
  done: 'Marquer comme fait',
}
