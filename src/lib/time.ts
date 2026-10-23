export const DEFAULT_TIME_ZONE = 'Europe/Paris'
export const LOCALE = 'fr-FR'

let currentTimeZone = DEFAULT_TIME_ZONE

/** Fuseau horaire des réglages, utilisé par défaut par les fonctions ci-dessous. */
export function setDisplayTimeZone(timeZone: string) {
  currentTimeZone = timeZone
}

/** Format d'heure : 24 h (par défaut) ou 12 h (AM/PM). */
export type HourCycle = 'h23' | 'h12'

const HOUR_CYCLE_KEY = 'monhub.hourCycle'

function storedHourCycle(): HourCycle {
  try {
    return localStorage.getItem(HOUR_CYCLE_KEY) === 'h12' ? 'h12' : 'h23'
  } catch {
    return 'h23'
  }
}

let currentHourCycle: HourCycle = storedHourCycle()

/** Format d'heure choisi dans les réglages, utilisé par tous les affichages d'heure. */
export function hourCycle(): HourCycle {
  return currentHourCycle
}

/** Appliqué par la synchronisation des réglages ; gardé en local pour l'affichage au démarrage. */
export function setHourCycle(value: HourCycle) {
  currentHourCycle = value
  try {
    localStorage.setItem(HOUR_CYCLE_KEY, value)
  } catch {
    // Préférence non conservée : sans gravité.
  }
}

/** Heure enregistrée « HH:MM » (alarme, échéance) affichée dans le format choisi. */
export function formatClockTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/)
  if (currentHourCycle === 'h23' || !match) return value
  const [hour, minute] = [Number(match[1]), Number(match[2])]
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h12', timeZone: 'UTC' }).format(Date.UTC(2000, 0, 1, hour, minute))
}

export function formatTime(date: Date, timeZone = currentTimeZone): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: currentHourCycle, timeZone }).format(date)
}

export function formatLongDate(date: Date, timeZone = currentTimeZone): string {
  const text = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone }).format(date)
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** « à l'instant », « il y a 5 min », « il y a 3 h », puis la date (« 12 oct., 08:30 »). */
export function formatRelative(date: Date, now = new Date(), timeZone = currentTimeZone): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (seconds < 45) return 'à l’instant'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: currentHourCycle, timeZone }).format(date)
}

/** Millisecondes jusqu'au début de la minute suivante (pour rafraîchir une horloge pile à l'heure). */
export function msUntilNextMinute(date: Date): number {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds())
}
