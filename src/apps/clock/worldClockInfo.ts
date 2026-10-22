import { timeZoneOffsetMinutes, zonedParts } from '../../../supabase/functions/_shared/zonedTime'

/** Décalage d'un fuseau par rapport au fuseau de référence : « +6 h », « −5 h 30 », « Même heure ». */
export function describeOffset(date: Date, timeZone: string, referenceZone: string): string {
  const diff = timeZoneOffsetMinutes(date, timeZone) - timeZoneOffsetMinutes(date, referenceZone)
  if (diff === 0) return 'Même heure'
  const sign = diff > 0 ? '+' : '−'
  const hours = Math.floor(Math.abs(diff) / 60)
  const minutes = Math.abs(diff) % 60
  return `${sign}${hours} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}`
}

/** « Aujourd’hui », « Demain » ou « Hier » par rapport au fuseau de référence. */
export function describeDay(date: Date, timeZone: string, referenceZone: string): string {
  const here = zonedParts(date, referenceZone)
  const there = zonedParts(date, timeZone)
  const diff = Math.round(
    (Date.UTC(there.year, there.month - 1, there.day) - Date.UTC(here.year, here.month - 1, here.day)) / 86_400_000,
  )
  return diff === 0 ? 'Aujourd’hui' : diff === 1 ? 'Demain' : diff === -1 ? 'Hier' : diff > 0 ? `+${diff} j` : `${diff} j`
}

/** Jour ou nuit, approximation par l'heure locale (7 h – 20 h). */
export function isDaytime(date: Date, timeZone: string): boolean {
  const { hour } = zonedParts(date, timeZone)
  return hour >= 7 && hour < 20
}

export function formatZoneTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(date)
}
