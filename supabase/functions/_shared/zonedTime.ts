// Calculs d'heures dans un fuseau horaire, sans bibliothèque (Intl uniquement).
// Code pur partagé entre l'app (src/) et les Edge Functions, testé par Vitest.

export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  /** Jour ISO : 1 = lundi … 7 = dimanche. */
  weekday: number
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let cached = formatters.get(timeZone)
  if (!cached) {
    cached = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    })
    formatters.set(timeZone, cached)
  }
  return cached
}

/** Date et heure locales d'un instant dans un fuseau. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(date)
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS[get('weekday')] ?? 1,
  }
}

/** Décalage du fuseau par rapport à UTC à cet instant, en minutes (ex. +120 à Paris l'été). */
export function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/**
 * Instant correspondant à une date/heure locale dans un fuseau.
 * - heure ambiguë (passage à l'heure d'hiver, elle existe deux fois) : la première ;
 * - heure inexistante (passage à l'heure d'été) : juste après le saut, comme les réveils des téléphones.
 */
export function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute)
  // Candidats calculés avec les décalages en vigueur la veille et le lendemain.
  const offsets = new Set([
    timeZoneOffsetMinutes(new Date(naive - 24 * 3600 * 1000), timeZone),
    timeZoneOffsetMinutes(new Date(naive), timeZone),
    timeZoneOffsetMinutes(new Date(naive + 24 * 3600 * 1000), timeZone),
  ])
  const candidates = [...offsets].map((offset) => new Date(naive - offset * 60000)).sort((a, b) => a.getTime() - b.getTime())
  const exact = candidates.find((candidate) => {
    const parts = zonedParts(candidate, timeZone)
    return parts.day === day && parts.hour === hour && parts.minute === minute
  })
  return exact ?? candidates[candidates.length - 1]
}

export interface AlarmRule {
  /** « HH:MM » */
  time: string
  /** Jours ISO de répétition ; vide = une seule fois (prochaine occurrence). */
  days: number[]
}

/** Prochaine sonnerie d'une alarme strictement après `after`. */
export function nextAlarmOccurrence(rule: AlarmRule, after: Date, timeZone: string): Date {
  const [hour, minute] = rule.time.split(':').map(Number)
  const today = zonedParts(after, timeZone)
  for (let offset = 0; offset <= 7; offset++) {
    // Midi UTC du jour local visé : évite les effets de bord autour de minuit.
    const probe = new Date(Date.UTC(today.year, today.month - 1, today.day + offset, 12))
    const weekday = ((today.weekday - 1 + offset) % 7) + 1
    if (rule.days.length && !rule.days.includes(weekday)) continue
    const candidate = zonedToUtc(probe.getUTCFullYear(), probe.getUTCMonth() + 1, probe.getUTCDate(), hour, minute, timeZone)
    if (candidate.getTime() > after.getTime()) return candidate
  }
  // Inatteignable (au moins un jour sur 8 correspond), par sécurité :
  return new Date(after.getTime() + 24 * 60 * 60 * 1000)
}
