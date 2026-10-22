export const DEFAULT_TIME_ZONE = 'Europe/Paris'
export const LOCALE = 'fr-FR'

export function formatTime(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date)
}

export function formatLongDate(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const text = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », puis la date (« 12 oct., 08:30 »). */
export function formatRelative(date: Date, now = new Date(), timeZone = DEFAULT_TIME_ZONE): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 45) return 'à l’instant'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date)
}

/** Millisecondes jusqu'au début de la minute suivante (pour rafraîchir une horloge pile à l'heure). */
export function msUntilNextMinute(date: Date): number {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds())
}
