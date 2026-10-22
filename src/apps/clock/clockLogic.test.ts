import { describe, expect, it } from 'vitest'
import { describeDays, findNextAlarm, formatCountdown } from './alarms'
import { searchCities } from './cities'
import { addLap, elapsed, formatStopwatch, INITIAL_STOPWATCH, lapRows, pauseStopwatch, startStopwatch } from './stopwatch'
import { describeDuration, formatDuration, remainingSeconds } from './timers'
import type { Alarm, Timer } from './types'

describe('alarmes', () => {
  it('décrit les jours de répétition', () => {
    expect(describeDays([])).toBe('Une fois')
    expect(describeDays([1, 2, 3, 4, 5, 6, 7])).toBe('Tous les jours')
    expect(describeDays([5, 4, 3, 2, 1])).toBe('En semaine')
    expect(describeDays([6, 7])).toBe('Week-end')
    expect(describeDays([1, 3, 5])).toBe('Lun, Mer, Ven')
  })

  it('écrit le temps avant la sonnerie', () => {
    expect(formatCountdown(30_000)).toBe('dans moins d’une minute')
    expect(formatCountdown((7 * 60 + 12) * 60_000)).toBe('dans 7 h 12 min')
    expect(formatCountdown((26 * 60) * 60_000)).toBe('dans 1 j 2 h')
  })

  it('trouve la prochaine alarme active', () => {
    const base = { label: '', sound: 'bip', snooze_minutes: 10 }
    const alarms: Alarm[] = [
      { ...base, id: 'a', time: '07:00', days: [], enabled: true },
      { ...base, id: 'b', time: '06:00', days: [], enabled: false },
      { ...base, id: 'c', time: '22:00', days: [], enabled: true },
    ]
    // Jeudi 22 octobre 2026, 10:00 à Paris
    const next = findNextAlarm(alarms, new Date('2026-10-22T08:00:00Z'), 'Europe/Paris')
    expect(next?.alarm.id).toBe('c')
    expect(findNextAlarm([], new Date(), 'Europe/Paris')).toBeNull()
  })
})

describe('minuteurs', () => {
  it('formate les durées', () => {
    expect(formatDuration(3909)).toBe('1:05:09')
    expect(formatDuration(270)).toBe('4:30')
    expect(formatDuration(6.2)).toBe('0:07')
    expect(describeDuration(1500)).toBe('25 min')
    expect(describeDuration(5400)).toBe('1 h 30')
    expect(describeDuration(45)).toBe('45 s')
  })

  it('calcule le temps restant selon l’état', () => {
    const base: Timer = { id: 't', label: '', duration_seconds: 300, state: 'idle', ends_at: null, remaining_seconds: null }
    const now = Date.parse('2026-10-22T10:00:00Z')
    expect(remainingSeconds(base, now)).toBe(300)
    expect(remainingSeconds({ ...base, state: 'running', ends_at: '2026-10-22T10:01:00Z' }, now)).toBe(60)
    expect(remainingSeconds({ ...base, state: 'running', ends_at: '2026-10-22T09:59:00Z' }, now)).toBe(0)
    expect(remainingSeconds({ ...base, state: 'paused', remaining_seconds: 42 }, now)).toBe(42)
  })
})

describe('chronomètre', () => {
  it('cumule les périodes et survit aux pauses', () => {
    let state = startStopwatch(INITIAL_STOPWATCH, 1000)
    expect(elapsed(state, 4000)).toBe(3000)
    state = pauseStopwatch(state, 4000)
    expect(elapsed(state, 99_000)).toBe(3000)
    state = startStopwatch(state, 10_000)
    expect(elapsed(state, 12_500)).toBe(5500)
  })

  it('marque le meilleur et le pire tour', () => {
    let state = startStopwatch(INITIAL_STOPWATCH, 0)
    state = addLap(state, 10_000) // tour 1 : 10 s
    state = addLap(state, 18_000) // tour 2 : 8 s
    state = addLap(state, 30_000) // tour 3 : 12 s
    expect(lapRows(state.laps)).toEqual([
      { index: 1, split: 10_000, total: 10_000, best: false, worst: false },
      { index: 2, split: 8_000, total: 18_000, best: true, worst: false },
      { index: 3, split: 12_000, total: 30_000, best: false, worst: true },
    ])
    expect(lapRows([5000]).some((row) => row.best || row.worst)).toBe(false)
  })

  it('affiche les centièmes', () => {
    expect(formatStopwatch(83_456)).toBe('01:23,45')
    expect(formatStopwatch(3_683_456)).toBe('1:01:23,45')
  })
})

describe('villes', () => {
  it('trouve une ville sans accent ni majuscule', () => {
    expect(searchCities('seoul')[0]).toMatchObject({ label: 'Séoul', timeZone: 'Asia/Seoul' })
    expect(searchCities('montreal')[0].timeZone).toBe('America/Toronto')
  })
})
