import { describe, expect, it } from 'vitest'
import { nextAlarmOccurrence, timeZoneOffsetMinutes, zonedParts, zonedToUtc } from './zonedTime'

const PARIS = 'Europe/Paris'

describe('zonedParts', () => {
  it('donne l’heure locale et le jour ISO', () => {
    // Jeudi 22 octobre 2026, 23:30 à Paris
    expect(zonedParts(new Date('2026-10-22T21:30:00Z'), PARIS)).toMatchObject({ day: 22, hour: 23, minute: 30, weekday: 4 })
    expect(zonedParts(new Date('2026-10-22T21:30:00Z'), 'Asia/Tokyo')).toMatchObject({ day: 23, hour: 6, weekday: 5 })
  })
})

describe('timeZoneOffsetMinutes', () => {
  it('suit l’heure d’été et d’hiver', () => {
    expect(timeZoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'), PARIS)).toBe(120)
    expect(timeZoneOffsetMinutes(new Date('2026-12-01T12:00:00Z'), PARIS)).toBe(60)
    expect(timeZoneOffsetMinutes(new Date('2026-12-01T12:00:00Z'), 'Asia/Kolkata')).toBe(330)
    expect(timeZoneOffsetMinutes(new Date('2026-12-01T12:00:00Z'), 'America/New_York')).toBe(-300)
  })
})

describe('zonedToUtc', () => {
  it('convertit une heure locale', () => {
    expect(zonedToUtc(2026, 10, 22, 7, 0, PARIS).toISOString()).toBe('2026-10-22T05:00:00.000Z')
    expect(zonedToUtc(2026, 12, 1, 7, 0, PARIS).toISOString()).toBe('2026-12-01T06:00:00.000Z')
  })

  it('gère le jour du passage à l’heure d’hiver (25 octobre 2026)', () => {
    expect(zonedToUtc(2026, 10, 25, 7, 0, PARIS).toISOString()).toBe('2026-10-25T06:00:00.000Z')
  })

  it('décale une heure inexistante (passage à l’heure d’été, 29 mars 2026 à 02:30)', () => {
    const result = zonedToUtc(2026, 3, 29, 2, 30, PARIS)
    expect(zonedParts(result, PARIS)).toMatchObject({ day: 29, hour: 3, minute: 30 })
  })
})

describe('nextAlarmOccurrence', () => {
  // Jeudi 22 octobre 2026, 10:00 à Paris
  const thursdayMorning = new Date('2026-10-22T08:00:00Z')

  it('sonne plus tard le jour même si l’heure n’est pas passée', () => {
    expect(nextAlarmOccurrence({ time: '18:00', days: [] }, thursdayMorning, PARIS).toISOString()).toBe('2026-10-22T16:00:00.000Z')
  })

  it('sonne le lendemain si l’heure est passée', () => {
    expect(nextAlarmOccurrence({ time: '07:00', days: [] }, thursdayMorning, PARIS).toISOString()).toBe('2026-10-23T05:00:00.000Z')
  })

  it('respecte les jours de répétition', () => {
    // Lundi → vendredi à 07:00 : prochain = vendredi 23
    expect(nextAlarmOccurrence({ time: '07:00', days: [1, 2, 3, 4, 5] }, thursdayMorning, PARIS).toISOString()).toBe(
      '2026-10-23T05:00:00.000Z',
    )
    // Week-end à 09:00 : samedi 24 (encore à l'heure d'été)
    expect(nextAlarmOccurrence({ time: '09:00', days: [6, 7] }, thursdayMorning, PARIS).toISOString()).toBe('2026-10-24T07:00:00.000Z')
    // Lundi seulement : lundi 26, après le passage à l'heure d'hiver (UTC+1)
    expect(nextAlarmOccurrence({ time: '07:00', days: [1] }, thursdayMorning, PARIS).toISOString()).toBe('2026-10-26T06:00:00.000Z')
  })

  it('va à la semaine suivante si le seul jour prévu est aujourd’hui mais passé', () => {
    expect(nextAlarmOccurrence({ time: '07:00', days: [4] }, thursdayMorning, PARIS).toISOString()).toBe('2026-10-29T06:00:00.000Z')
  })

  it('est strictement après l’instant donné', () => {
    const exactly = new Date('2026-10-22T16:00:00Z')
    expect(nextAlarmOccurrence({ time: '18:00', days: [] }, exactly, PARIS).toISOString()).toBe('2026-10-23T16:00:00.000Z')
  })
})
