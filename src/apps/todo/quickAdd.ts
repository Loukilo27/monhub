import { addDays, isoWeekday } from '../../../supabase/functions/_shared/recurrence'

/**
 * Saisie rapide d'une tâche en langage naturel, ex. :
 *   « Appeler le garage demain 14h #voiture !1 »
 * → titre « Appeler le garage », échéance demain à 14:00, étiquette « voiture », priorité 1.
 *
 * Reconnu : aujourd'hui, ce soir, demain, après-demain, lundi… dimanche (prochain), dans N jours /
 * semaines, le 12, 12/11, 12/11/2027 ; 14h, 14h30, 14:30, à 9h, midi ; !1 à !4 ; #étiquette.
 */
export interface QuickAddResult {
  title: string
  dueDate: string | null
  dueTime: string | null
  priority: number | null
  tags: string[]
}

const WEEKDAYS: Record<string, number> = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 7 }

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** `today` : date locale « AAAA-MM-JJ » du jour. */
export function parseQuickAdd(input: string, today: string): QuickAddResult {
  let text = ` ${input} `
  let dueDate: string | null = null
  let dueTime: string | null = null
  let priority: number | null = null
  const tags: string[] = []

  const take = (pattern: RegExp, handle: (match: RegExpMatchArray) => boolean | void) => {
    const match = text.match(pattern)
    if (match && handle(match) !== false) text = text.replace(match[0], ' ')
  }

  take(/\s!([1-4])(?=\s)/, (m) => {
    priority = Number(m[1])
  })
  for (let match = text.match(/\s#([\p{L}\p{N}_-]+)/u); match; match = text.match(/\s#([\p{L}\p{N}_-]+)/u)) {
    tags.push(match[1].toLowerCase())
    text = text.replace(match[0], ' ')
  }

  // Heure (avant les dates, pour ne pas confondre « 14h » avec un jour).
  take(/\s(?:à\s+|a\s+)?(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?=\s)/i, (m) => {
    const hours = Number(m[1])
    const minutes = Number(m[2] ?? 0)
    if (hours > 23 || minutes > 59) return false
    dueTime = `${pad(hours)}:${pad(minutes)}`
  })
  take(/\s(?:à\s+)?midi(?=\s)/i, () => {
    dueTime = '12:00'
  })

  // Dates
  take(/\s(?:aujourd['’]hui|auj)(?=\s)/i, () => {
    dueDate = today
  })
  take(/\sce\s+soir(?=\s)/i, () => {
    dueDate = today
    dueTime ??= '19:00'
  })
  take(/\sapr[eè]s[-\s]demain(?=\s)/i, () => {
    dueDate = addDays(today, 2)
  })
  take(/\sdemain(?=\s)/i, () => {
    dueDate = addDays(today, 1)
  })
  take(/\sdans\s+(\d+)\s+(jours?|semaines?)(?=\s)/i, (m) => {
    dueDate = addDays(today, Number(m[1]) * (m[2].toLowerCase().startsWith('semaine') ? 7 : 1))
  })
  take(/\s(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?(?=\s)/i, (m) => {
    const target = WEEKDAYS[m[1].toLowerCase()]
    const delta = (target - isoWeekday(today) + 7) % 7 || 7
    dueDate = addDays(today, delta)
  })
  take(/\s(?:le\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/i, (m) => {
    const year = Number(today.slice(0, 4))
    const day = Number(m[1])
    const wantedMonth = Number(m[2])
    let wantedYear = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : year
    if (wantedMonth < 1 || wantedMonth > 12 || day < 1 || day > 31) return false
    let candidate = `${wantedYear}-${pad(wantedMonth)}-${pad(day)}`
    if (!m[3] && candidate < today) candidate = `${++wantedYear}-${pad(wantedMonth)}-${pad(day)}`
    dueDate = candidate
  })
  take(/\sle\s+(\d{1,2})(?:er)?(?=\s)/i, (m) => {
    const day = Number(m[1])
    if (day < 1 || day > 31) return false
    const [year, month, todayDay] = today.split('-').map(Number)
    const nextMonth = month === 12 ? [year + 1, 1] : [year, month + 1]
    const [y, mo] = day >= todayDay ? [year, month] : nextMonth
    dueDate = `${y}-${pad(mo)}-${pad(day)}`
  })

  // Une heure seule vise aujourd'hui (ou demain si elle est déjà passée, ce que l'appelant peut ajuster).
  if (dueTime && !dueDate) dueDate = today

  return { title: text.replace(/\s+/g, ' ').trim(), dueDate, dueTime, priority, tags }
}
