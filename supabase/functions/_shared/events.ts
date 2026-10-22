// Occurrences d'événements de calendrier (ponctuels ou récurrents), en heure locale.
// Code pur partagé entre l'app et les Edge Functions, testé par Vitest (events.test.ts).
//
// Une occurrence garde l'heure locale de l'événement d'origine : un rendez-vous à 9 h
// chaque lundi reste à 9 h après le changement d'heure.

import { addDays, nextOccurrence, occurrencesBetween, parseRRule } from './recurrence.ts'
import { zonedParts, zonedToUtc } from './zonedTime.ts'

export interface EventLike {
  start_at: string
  end_at: string
  all_day: boolean
  recurrence_rule: string | null
  /** Occurrences supprimées (dates locales « AAAA-MM-JJ »). */
  exception_dates: string[]
}

export interface Occurrence {
  /** Date locale de début de l'occurrence. */
  date: string
  start: Date
  end: Date
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function localDate(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Occurrence d'un événement commençant à la date locale donnée. */
export function occurrenceOn(event: EventLike, date: string, timeZone: string): Occurrence {
  const original = new Date(event.start_at)
  const duration = new Date(event.end_at).getTime() - original.getTime()
  const time = zonedParts(original, timeZone)
  const [year, month, day] = date.split('-').map(Number)
  const start = event.all_day ? zonedToUtc(year, month, day, 0, 0, timeZone) : zonedToUtc(year, month, day, time.hour, time.minute, timeZone)
  return { date, start, end: new Date(start.getTime() + duration) }
}

/** Occurrences qui chevauchent l'intervalle [from, to[. */
export function expandEvent(event: EventLike, from: Date, to: Date, timeZone: string): Occurrence[] {
  const rule = parseRRule(event.recurrence_rule)
  const first = occurrenceOn(event, localDate(new Date(event.start_at), timeZone), timeZone)
  if (!rule) return first.start < to && first.end > from ? [first] : []
  // Un événement long qui a commencé avant `from` peut encore le chevaucher.
  const spanDays = Math.ceil((first.end.getTime() - first.start.getTime()) / 86_400_000) + 1
  const dates = occurrencesBetween(rule, first.date, addDays(localDate(from, timeZone), -spanDays), localDate(to, timeZone))
  return dates
    .filter((date) => !event.exception_dates.includes(date))
    .map((date) => occurrenceOn(event, date, timeZone))
    .filter((occurrence) => occurrence.start < to && occurrence.end > from)
}

/** Première occurrence qui commence strictement après `after`, ou null. */
export function nextEventOccurrence(event: EventLike, after: Date, timeZone: string): Occurrence | null {
  const rule = parseRRule(event.recurrence_rule)
  const first = occurrenceOn(event, localDate(new Date(event.start_at), timeZone), timeZone)
  if (!rule) return first.start > after ? first : null
  if (first.start > after && !event.exception_dates.includes(first.date)) return first
  let cursor = addDays(localDate(after, timeZone), -1)
  for (let guard = 0; guard < 500; guard++) {
    const date = nextOccurrence(rule, first.date, cursor)
    if (!date) return null
    const occurrence = occurrenceOn(event, date, timeZone)
    if (occurrence.start > after && !event.exception_dates.includes(date)) return occurrence
    cursor = date
  }
  return null
}

/** Instant d'envoi du prochain rappel « X minutes avant », ou null. */
export function nextEventReminder(event: EventLike, offsetMinutes: number, now: Date, timeZone: string): { sendAt: Date; occurrence: Occurrence } | null {
  const occurrence = nextEventOccurrence(event, new Date(now.getTime() + offsetMinutes * 60_000), timeZone)
  return occurrence && { sendAt: new Date(occurrence.start.getTime() - offsetMinutes * 60_000), occurrence }
}
