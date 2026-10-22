export const DEFAULT_TIME_ZONE = 'Europe/Paris'
export const LOCALE = 'fr-FR'

export function formatTime(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date)
}

export function formatLongDate(date: Date, timeZone = DEFAULT_TIME_ZONE): string {
  const text = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Millisecondes jusqu'au début de la minute suivante (pour rafraîchir une horloge pile à l'heure). */
export function msUntilNextMinute(date: Date): number {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds())
}
