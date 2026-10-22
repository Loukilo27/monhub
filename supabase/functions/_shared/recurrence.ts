// Récurrences au format RRULE (sous-ensemble de la RFC 5545) sur des dates locales « AAAA-MM-JJ ».
// Code pur partagé entre l'app et les Edge Functions, testé par Vitest (recurrence.test.ts).
//
// Fréquences gérées : quotidienne, hebdomadaire (jours choisis), mensuelle (jour du mois),
// annuelle, avec intervalle (« tous les N … »), date de fin (UNTIL) ou nombre d'occurrences (COUNT).
// Un jour du mois absent (31 en avril, 29 février) est ramené au dernier jour du mois.

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface Recurrence {
  freq: Frequency
  interval: number
  /** Jours ISO (1 = lundi … 7 = dimanche), pour WEEKLY. Vide = jour de la date de départ. */
  byDay: number[]
  /** Jour du mois, pour MONTHLY. Null = jour de la date de départ. */
  byMonthDay: number | null
  /** Dernière date possible (incluse), « AAAA-MM-JJ ». */
  until: string | null
  count: number | null
}

const DAY_CODES = ['', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const DAY_MS = 86_400_000

// ---------- Dates locales ----------

/** Numéro de jour (jours depuis 1970) d'une date « AAAA-MM-JJ ». */
export function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS)
}

export function fromDayNumber(value: number): string {
  return new Date(value * DAY_MS).toISOString().slice(0, 10)
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(dayNumber(date) + days)
}

/** Jour ISO de la semaine (1 = lundi … 7 = dimanche). */
export function isoWeekday(date: string): number {
  return ((((dayNumber(date) + 3) % 7) + 7) % 7) + 1 // le 1er janvier 1970 était un jeudi
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ---------- RRULE ----------

export function parseRRule(rule: string | null | undefined): Recurrence | null {
  if (!rule) return null
  const parts = Object.fromEntries(
    rule
      .replace(/^RRULE:/i, '')
      .split(';')
      .map((part) => part.split('=') as [string, string])
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key.toUpperCase(), value.toUpperCase()]),
  )
  const freq = parts.FREQ as Frequency
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) return null
  const until = parts.UNTIL?.match(/^(\d{4})(\d{2})(\d{2})/)
  return {
    freq,
    interval: Math.max(1, Number(parts.INTERVAL) || 1),
    byDay: (parts.BYDAY ?? '')
      .split(',')
      .map((code: string) => DAY_CODES.indexOf(code.replace(/^[+-]?\d+/, '')))
      .filter((day: number) => day > 0)
      .sort(),
    byMonthDay: parts.BYMONTHDAY ? Number(parts.BYMONTHDAY) || null : null,
    until: until ? `${until[1]}-${until[2]}-${until[3]}` : null,
    count: parts.COUNT ? Number(parts.COUNT) || null : null,
  }
}

export function formatRRule(recurrence: Recurrence): string {
  const parts = [`FREQ=${recurrence.freq}`]
  if (recurrence.interval > 1) parts.push(`INTERVAL=${recurrence.interval}`)
  if (recurrence.freq === 'WEEKLY' && recurrence.byDay.length) parts.push(`BYDAY=${recurrence.byDay.map((day) => DAY_CODES[day]).join(',')}`)
  if (recurrence.freq === 'MONTHLY' && recurrence.byMonthDay) parts.push(`BYMONTHDAY=${recurrence.byMonthDay}`)
  if (recurrence.until) parts.push(`UNTIL=${recurrence.until.replace(/-/g, '')}`)
  if (recurrence.count) parts.push(`COUNT=${recurrence.count}`)
  return parts.join(';')
}

// ---------- Occurrences ----------

/** Toutes les occurrences à partir de `start`, dans l'ordre, jusqu'à `to` (inclus) ou `limit`. */
function* generate(recurrence: Recurrence, start: string, to: string): Generator<string> {
  const end = Math.min(dayNumber(to), recurrence.until ? dayNumber(recurrence.until) : Infinity)
  const first = dayNumber(start)
  const { interval } = recurrence
  let emitted = 0
  const emit = function* (date: string) {
    if (dayNumber(date) < first || dayNumber(date) > end) return
    if (recurrence.count !== null && emitted >= recurrence.count) return
    emitted++
    yield date
  }
  const exhausted = () => recurrence.count !== null && emitted >= recurrence.count

  switch (recurrence.freq) {
    case 'DAILY':
      for (let day = first; day <= end && !exhausted(); day += interval) yield* emit(fromDayNumber(day))
      return
    case 'WEEKLY': {
      const days = recurrence.byDay.length ? recurrence.byDay : [isoWeekday(start)]
      const weekStart = first - (isoWeekday(start) - 1)
      for (let week = weekStart; week <= end && !exhausted(); week += 7 * interval) {
        for (const day of days) yield* emit(fromDayNumber(week + day - 1))
      }
      return
    }
    case 'MONTHLY':
    case 'YEARLY': {
      const [startYear, startMonth, startDay] = start.split('-').map(Number)
      const wanted = recurrence.freq === 'MONTHLY' ? (recurrence.byMonthDay ?? startDay) : startDay
      for (let step = 0; !exhausted(); step++) {
        const monthIndex = recurrence.freq === 'MONTHLY' ? startMonth - 1 + step * interval : startMonth - 1 + step * 12 * interval
        const year = startYear + Math.floor(monthIndex / 12)
        const month = (monthIndex % 12) + 1
        const date = ymd(year, month, Math.min(wanted, daysInMonth(year, month)))
        if (dayNumber(date) > end) return
        yield* emit(date)
      }
    }
  }
}

/** Occurrences comprises entre `from` et `to` (inclus). */
export function occurrencesBetween(recurrence: Recurrence, start: string, from: string, to: string, limit = 1000): string[] {
  const result: string[] = []
  const min = dayNumber(from)
  for (const date of generate(recurrence, start, to)) {
    if (dayNumber(date) >= min) result.push(date)
    if (result.length >= limit) break
  }
  return result
}

/** Première occurrence strictement après `after`, ou null si la série est terminée. */
export function nextOccurrence(recurrence: Recurrence, start: string, after: string): string | null {
  const horizon = addDays(after, 366 * 5 * recurrence.interval)
  for (const date of generate(recurrence, start, horizon)) {
    if (dayNumber(date) > dayNumber(after)) return date
  }
  return null
}

// ---------- Description en français ----------

const DAY_NAMES = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
const MONTH_NAMES = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function joinFrench(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`
}

export function describeRecurrence(recurrence: Recurrence, start: string): string {
  const n = recurrence.interval
  const [, month, day] = start.split('-').map(Number)
  let text: string
  switch (recurrence.freq) {
    case 'DAILY':
      text = n === 1 ? 'Tous les jours' : `Tous les ${n} jours`
      break
    case 'WEEKLY': {
      const days = recurrence.byDay.length ? recurrence.byDay : [isoWeekday(start)]
      const which =
        days.join() === '1,2,3,4,5' ? 'en semaine' : days.length === 7 ? 'tous les jours' : `le ${joinFrench(days.map((value) => DAY_NAMES[value]))}`
      text = `${n === 1 ? 'Chaque semaine' : `Toutes les ${n} semaines`} ${which}`
      break
    }
    case 'MONTHLY': {
      const monthDay = recurrence.byMonthDay ?? day
      text = `${n === 1 ? 'Chaque mois' : `Tous les ${n} mois`} le ${monthDay === 1 ? '1er' : monthDay}`
      break
    }
    case 'YEARLY':
      text = `${n === 1 ? 'Chaque année' : `Tous les ${n} ans`} le ${day === 1 ? '1er' : day} ${MONTH_NAMES[month]}`
      break
  }
  if (recurrence.until) {
    const [y, m, d] = recurrence.until.split('-').map(Number)
    text += ` jusqu’au ${d} ${MONTH_NAMES[m]} ${y}`
  } else if (recurrence.count) {
    text += `, ${recurrence.count} fois`
  }
  return text
}
