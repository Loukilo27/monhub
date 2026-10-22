import { describe, expect, it } from 'vitest'
import { formatLongDate, formatRelative, formatTime, msUntilNextMinute } from './time'

describe('formatTime', () => {
  it('affiche l’heure de Paris au format 24 h', () => {
    // 22 octobre 2026, 14:05 UTC = 16:05 à Paris (heure d'été)
    expect(formatTime(new Date('2026-10-22T14:05:00Z'))).toBe('16:05')
    // Après le passage à l'heure d'hiver (25 octobre 2026) : UTC+1
    expect(formatTime(new Date('2026-11-02T23:30:00Z'))).toBe('00:30')
  })

  it('accepte un autre fuseau', () => {
    expect(formatTime(new Date('2026-10-22T14:05:00Z'), 'Asia/Tokyo')).toBe('23:05')
  })
})

describe('formatLongDate', () => {
  it('écrit la date en français avec une majuscule', () => {
    expect(formatLongDate(new Date('2026-10-22T10:00:00Z'))).toBe('Jeudi 22 octobre')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-10-22T14:00:00Z')
  it('écrit une durée relative en français', () => {
    expect(formatRelative(new Date('2026-10-22T13:59:30Z'), now)).toBe('à l’instant')
    expect(formatRelative(new Date('2026-10-22T13:55:00Z'), now)).toBe('il y a 5 min')
    expect(formatRelative(new Date('2026-10-22T11:00:00Z'), now)).toBe('il y a 3 h')
    expect(formatRelative(new Date('2026-10-12T06:30:00Z'), now)).toBe('12 oct., 08:30')
  })
})

describe('msUntilNextMinute', () => {
  it('calcule le temps restant avant la minute suivante', () => {
    expect(msUntilNextMinute(new Date(2026, 0, 1, 10, 0, 45, 500))).toBe(14_500)
    expect(msUntilNextMinute(new Date(2026, 0, 1, 10, 0, 0, 0))).toBe(60_000)
  })
})
