import { describe, expect, it } from 'vitest'
import { expandEvent, nextEventOccurrence, nextEventReminder, type EventLike } from './events'

const PARIS = 'Europe/Paris'

function event(overrides: Partial<EventLike>): EventLike {
  return {
    start_at: '2026-10-19T07:00:00Z', // lundi 19 octobre, 9:00 à Paris
    end_at: '2026-10-19T08:00:00Z',
    all_day: false,
    recurrence_rule: null,
    exception_dates: [],
    ...overrides,
  }
}

describe('expandEvent', () => {
  it('garde un événement ponctuel qui chevauche la période', () => {
    expect(expandEvent(event({}), new Date('2026-10-19T00:00:00Z'), new Date('2026-10-20T00:00:00Z'), PARIS)).toHaveLength(1)
    expect(expandEvent(event({}), new Date('2026-10-20T00:00:00Z'), new Date('2026-10-21T00:00:00Z'), PARIS)).toHaveLength(0)
  })

  it('garde 9 h locale après le passage à l’heure d’hiver', () => {
    const weekly = event({ recurrence_rule: 'FREQ=WEEKLY' })
    const occurrences = expandEvent(weekly, new Date('2026-10-18T00:00:00Z'), new Date('2026-11-03T00:00:00Z'), PARIS)
    expect(occurrences.map((o) => o.start.toISOString())).toEqual([
      '2026-10-19T07:00:00.000Z', // UTC+2
      '2026-10-26T08:00:00.000Z', // UTC+1
      '2026-11-02T08:00:00.000Z',
    ])
    expect(occurrences[1].end.toISOString()).toBe('2026-10-26T09:00:00.000Z')
  })

  it('omet les occurrences supprimées', () => {
    const daily = event({ recurrence_rule: 'FREQ=DAILY', exception_dates: ['2026-10-20'] })
    const dates = expandEvent(daily, new Date('2026-10-19T00:00:00Z'), new Date('2026-10-22T00:00:00Z'), PARIS).map((o) => o.date)
    expect(dates).toEqual(['2026-10-19', '2026-10-21'])
  })

  it('gère les journées entières sur plusieurs jours', () => {
    const holiday = event({ all_day: true, start_at: '2026-10-23T22:00:00Z', end_at: '2026-10-26T23:00:00Z' }) // 24 → 26 inclus
    expect(expandEvent(holiday, new Date('2026-10-25T10:00:00Z'), new Date('2026-10-25T12:00:00Z'), PARIS)).toHaveLength(1)
  })
})

describe('prochaine occurrence et rappels', () => {
  it('trouve la prochaine occurrence d’une série', () => {
    const weekly = event({ recurrence_rule: 'FREQ=WEEKLY;BYDAY=MO,TH' })
    // Après jeudi 22 octobre 10:00 → lundi 26 à 9:00 (UTC+1)
    expect(nextEventOccurrence(weekly, new Date('2026-10-22T08:00:00Z'), PARIS)?.start.toISOString()).toBe('2026-10-26T08:00:00.000Z')
    expect(nextEventOccurrence(event({}), new Date('2026-10-22T08:00:00Z'), PARIS)).toBeNull()
  })

  it('calcule le prochain rappel « X minutes avant »', () => {
    const daily = event({ recurrence_rule: 'FREQ=DAILY' })
    // Jeudi 22 à 8:50 Paris : le rappel 15 min avant 9:00 est déjà passé → vendredi 23 à 8:45
    const reminder = nextEventReminder(daily, 15, new Date('2026-10-22T06:50:00Z'), PARIS)
    expect(reminder?.sendAt.toISOString()).toBe('2026-10-23T06:45:00.000Z')
    // Rappel 1 jour avant : celui de vendredi 9:00 tombe jeudi 9:00, encore à venir
    expect(nextEventReminder(daily, 1440, new Date('2026-10-22T06:50:00Z'), PARIS)?.occurrence.date).toBe('2026-10-23')
  })
})
