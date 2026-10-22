import { describe, expect, it } from 'vitest'
import { isInQuietHours, localMinutes, shouldPush } from './notificationRules'

const PARIS = 'Europe/Paris'
// 23:30 à Paris le 22 octobre 2026 (UTC+2)
const lateEvening = new Date('2026-10-22T21:30:00Z')
// 12:00 à Paris
const noon = new Date('2026-10-22T10:00:00Z')

describe('localMinutes', () => {
  it('donne l’heure locale de Paris', () => {
    expect(localMinutes(lateEvening, PARIS)).toBe(23 * 60 + 30)
  })
})

describe('isInQuietHours', () => {
  const night = { enabled: true, start: '22:00', end: '07:00' }

  it('gère une plage qui passe minuit', () => {
    expect(isInQuietHours(lateEvening, PARIS, night)).toBe(true)
    expect(isInQuietHours(new Date('2026-10-23T04:59:00Z'), PARIS, night)).toBe(true) // 06:59
    expect(isInQuietHours(new Date('2026-10-23T05:00:00Z'), PARIS, night)).toBe(false) // 07:00
    expect(isInQuietHours(noon, PARIS, night)).toBe(false)
  })

  it('gère une plage dans la journée', () => {
    expect(isInQuietHours(noon, PARIS, { enabled: true, start: '11:00', end: '14:00' })).toBe(true)
  })

  it('est inactive si désactivée ou vide', () => {
    expect(isInQuietHours(lateEvening, PARIS, { ...night, enabled: false })).toBe(false)
    expect(isInQuietHours(lateEvening, PARIS, undefined)).toBe(false)
    expect(isInQuietHours(lateEvening, PARIS, { enabled: true, start: '10:00', end: '10:00' })).toBe(false)
  })
})

describe('shouldPush', () => {
  const prefs = { quietHours: { enabled: true, start: '22:00', end: '07:00' } }
  const reminder = (kind: string, source = 'todo', sendAt = lateEvening) => ({ kind, source, send_at: sendAt.toISOString() })

  it('respecte « Ne pas déranger » sauf pour les alarmes et minuteurs', () => {
    expect(shouldPush(reminder('task'), prefs, lateEvening, PARIS)).toBe(false)
    expect(shouldPush(reminder('alarm', 'clock'), prefs, lateEvening, PARIS)).toBe(true)
    expect(shouldPush(reminder('timer', 'clock'), prefs, lateEvening, PARIS)).toBe(true)
    expect(shouldPush(reminder('task', 'todo', noon), prefs, noon, PARIS)).toBe(true)
  })

  it('coupe les mini-applis désactivées', () => {
    expect(shouldPush(reminder('event', 'calendar', noon), { disabledApps: ['calendar'] }, noon, PARIS)).toBe(false)
  })

  it('n’envoie pas un rappel très en retard', () => {
    const old = new Date(noon.getTime() - 7 * 60 * 60 * 1000)
    expect(shouldPush(reminder('alarm', 'clock', old), {}, noon, PARIS)).toBe(false)
  })
})
