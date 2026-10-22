import { describe, expect, it } from 'vitest'
import { addDays, describeRecurrence, formatRRule, isoWeekday, nextOccurrence, occurrencesBetween, parseRRule } from './recurrence'

describe('dates locales', () => {
  it('calcule le jour de la semaine et ajoute des jours', () => {
    expect(isoWeekday('2026-10-22')).toBe(4) // jeudi
    expect(isoWeekday('2026-10-25')).toBe(7) // dimanche
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29')
  })
})

describe('RRULE', () => {
  it('lit et réécrit une règle', () => {
    const rule = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231'
    expect(parseRRule(rule)).toEqual({ freq: 'WEEKLY', interval: 2, byDay: [1, 3], byMonthDay: null, until: '2026-12-31', count: null })
    expect(formatRRule(parseRRule(rule)!)).toBe(rule)
    expect(parseRRule('RRULE:FREQ=MONTHLY;BYMONTHDAY=1;COUNT=6')).toMatchObject({ freq: 'MONTHLY', byMonthDay: 1, count: 6 })
  })

  it('refuse une règle invalide ou vide', () => {
    expect(parseRRule('FREQ=HOURLY')).toBeNull()
    expect(parseRRule('')).toBeNull()
    expect(parseRRule(null)).toBeNull()
  })
})

describe('occurrences', () => {
  it('quotidienne et tous les N jours', () => {
    expect(occurrencesBetween(parseRRule('FREQ=DAILY')!, '2026-10-22', '2026-10-22', '2026-10-25')).toEqual([
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(occurrencesBetween(parseRRule('FREQ=DAILY;INTERVAL=3')!, '2026-10-22', '2026-10-24', '2026-11-01')).toEqual([
      '2026-10-25',
      '2026-10-28',
      '2026-10-31',
    ])
  })

  it('hebdomadaire sur des jours choisis, toutes les 2 semaines', () => {
    // Départ jeudi 22 octobre ; lundis et jeudis, une semaine sur deux.
    expect(occurrencesBetween(parseRRule('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH')!, '2026-10-22', '2026-10-01', '2026-11-20')).toEqual([
      '2026-10-22',
      '2026-11-02',
      '2026-11-05',
      '2026-11-16',
      '2026-11-19',
    ])
  })

  it('mensuelle le 1er, et le 31 ramené à la fin du mois', () => {
    expect(occurrencesBetween(parseRRule('FREQ=MONTHLY;BYMONTHDAY=1')!, '2026-10-22', '2026-10-01', '2027-01-31')).toEqual([
      '2026-11-01',
      '2026-12-01',
      '2027-01-01',
    ])
    expect(occurrencesBetween(parseRRule('FREQ=MONTHLY')!, '2026-01-31', '2026-01-01', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ])
  })

  it('annuelle, y compris le 29 février', () => {
    expect(occurrencesBetween(parseRRule('FREQ=YEARLY')!, '2028-02-29', '2028-01-01', '2030-12-31')).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
    ])
  })

  it('respecte COUNT et UNTIL', () => {
    expect(occurrencesBetween(parseRRule('FREQ=DAILY;COUNT=3')!, '2026-10-22', '2026-10-23', '2026-12-31')).toEqual(['2026-10-23', '2026-10-24'])
    expect(nextOccurrence(parseRRule('FREQ=DAILY;UNTIL=20261024')!, '2026-10-22', '2026-10-24')).toBeNull()
  })

  it('trouve l’occurrence suivante (cocher une tâche récurrente)', () => {
    expect(nextOccurrence(parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR')!, '2026-10-19', '2026-10-23')).toBe('2026-10-26')
    expect(nextOccurrence(parseRRule('FREQ=MONTHLY;BYMONTHDAY=15')!, '2026-01-15', '2026-10-22')).toBe('2026-11-15')
  })
})

describe('describeRecurrence', () => {
  it('écrit la règle en français', () => {
    expect(describeRecurrence(parseRRule('FREQ=DAILY')!, '2026-10-22')).toBe('Tous les jours')
    expect(describeRecurrence(parseRRule('FREQ=DAILY;INTERVAL=3')!, '2026-10-22')).toBe('Tous les 3 jours')
    expect(describeRecurrence(parseRRule('FREQ=WEEKLY;BYDAY=MO,WE')!, '2026-10-22')).toBe('Chaque semaine le lundi et mercredi')
    expect(describeRecurrence(parseRRule('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR')!, '2026-10-22')).toBe('Chaque semaine en semaine')
    expect(describeRecurrence(parseRRule('FREQ=MONTHLY;BYMONTHDAY=1')!, '2026-10-22')).toBe('Chaque mois le 1er')
    expect(describeRecurrence(parseRRule('FREQ=YEARLY;UNTIL=20301231')!, '2026-03-12')).toBe('Chaque année le 12 mars jusqu’au 31 décembre 2030')
  })
})
