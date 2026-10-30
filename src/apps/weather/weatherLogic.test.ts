import { afterEach, describe, expect, it } from 'vitest'
import { setHourCycle } from '../../lib/time'
import { dayLabel, forecastUrl, hourLabel, nextHours, parseForecast, parseGeocoding, today } from './api'
import { condition, formatTemperature, skyGradient, weatherIcon } from './codes'
import { defaultCity, sameCity } from './data'
import type { WeatherCity } from './types'

/** Réponse Open-Meteo réduite (heure locale de la ville : 14:30). */
const RAW = {
  current: { time: '2026-10-30T14:30', temperature_2m: 12.6, apparent_temperature: 10.2, weather_code: 2, is_day: 1, wind_speed_10m: 14.4, relative_humidity_2m: 71 },
  hourly: {
    time: ['2026-10-30T12:00', '2026-10-30T13:00', '2026-10-30T14:00', '2026-10-30T15:00', '2026-10-30T16:00'],
    temperature_2m: [11, 12, 12.5, 13, 12],
    weather_code: [3, 3, 2, 61, 61],
    is_day: [1, 1, 1, 1, 0],
    precipitation_probability: [0, 5, 10, 60, 70],
  },
  daily: {
    time: ['2026-10-30', '2026-10-31'],
    weather_code: [61, 0],
    temperature_2m_max: [14.2, 16],
    temperature_2m_min: [6.1, 4.8],
    precipitation_probability_max: [70, 0],
    sunrise: ['2026-10-30T07:22', '2026-10-31T07:24'],
    sunset: ['2026-10-30T17:31', '2026-10-31T17:29'],
  },
}

afterEach(() => setHourCycle('h23'))

describe('prévisions Open-Meteo', () => {
  it('demande actuel, heures et 7 jours dans le fuseau de la ville', () => {
    const url = new URL(forecastUrl(48.85, 2.35))
    expect(url.searchParams.get('latitude')).toBe('48.85')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('forecast_days')).toBe('7')
    expect(url.searchParams.get('hourly')).toContain('precipitation_probability')
  })

  it('lit la réponse', () => {
    const forecast = parseForecast(RAW, new Date('2026-10-30T13:31:00Z'))
    expect(forecast.current).toEqual({ time: '2026-10-30T14:30', temperature: 12.6, apparent: 10.2, code: 2, isDay: true, wind: 14.4, humidity: 71 })
    expect(forecast.hourly[4]).toEqual({ time: '2026-10-30T16:00', temperature: 12, code: 61, isDay: false, precipitation: 70 })
    expect(forecast.daily[1]).toMatchObject({ date: '2026-10-31', code: 0, min: 4.8, max: 16, sunset: '2026-10-31T17:29' })
    expect(forecast.fetchedAt).toBe('2026-10-30T13:31:00.000Z')
  })

  it('refuse une réponse sans météo actuelle', () => {
    expect(() => parseForecast({})).toThrow('illisibles')
  })

  it('prochaines heures à partir de l’heure en cours de la ville', () => {
    const forecast = parseForecast(RAW)
    expect(nextHours(forecast, 2).map((hour) => hour.time)).toEqual(['2026-10-30T14:00', '2026-10-30T15:00'])
    expect(nextHours(forecast, 10)).toHaveLength(3)
    expect(today(forecast)).toMatchObject({ min: 6.1, max: 14.2 })
  })

  it('libellés d’heures et de jours', () => {
    expect(hourLabel('2026-10-30T09:00')).toBe('9 h')
    setHourCycle('h12')
    expect(hourLabel('2026-10-30T15:00')).toBe('3 PM')
    expect(hourLabel('2026-10-30T00:00')).toBe('12 AM')
    expect(dayLabel('2026-10-30', '2026-10-30')).toBe('Aujourd’hui')
    expect(dayLabel('2026-10-31', '2026-10-30')).toBe('Demain')
    expect(dayLabel('2026-11-01', '2026-10-30')).toBe('dimanche 1')
  })
})

describe('codes météo', () => {
  it('libellé, icône jour / nuit et fond', () => {
    expect(condition(0).label).toBe('Ciel dégagé')
    expect(weatherIcon(0, true)).not.toBe(weatherIcon(0, false))
    expect(condition(95).sky).toBe('storm')
    expect(condition(1234).label).toBe('Temps inconnu')
    expect(skyGradient(0, true)).not.toBe(skyGradient(0, false))
    expect(formatTemperature(-0.4)).toBe('0°')
    expect(formatTemperature(-2.6)).toBe('-3°')
    expect(formatTemperature(12.6)).toBe('13°')
  })
})

describe('recherche et villes', () => {
  it('lit les résultats de recherche', () => {
    expect(
      parseGeocoding({
        results: [
          { name: 'Lyon', admin1: 'Auvergne-Rhône-Alpes', country: 'France', latitude: 45.75, longitude: 4.85, timezone: 'Europe/Paris' },
          { name: 'Sans coordonnées' },
        ],
      }),
    ).toEqual([{ name: 'Lyon', admin1: 'Auvergne-Rhône-Alpes', country: 'France', latitude: 45.75, longitude: 4.85, timezone: 'Europe/Paris' }])
    expect(parseGeocoding({})).toEqual([])
  })

  it('ville par défaut : la favorite, sinon la première', () => {
    const city = (id: string, isFavorite = false): WeatherCity => ({ id, name: id, admin1: '', country: '', latitude: 0, longitude: 0, timezone: 'auto', position: 0, is_favorite: isFavorite })
    expect(defaultCity([city('a'), city('b', true)])?.id).toBe('b')
    expect(defaultCity([city('a'), city('b')])?.id).toBe('a')
    expect(defaultCity([])).toBeUndefined()
    expect(sameCity({ latitude: 45.75, longitude: 4.85 }, { latitude: 45.7512, longitude: 4.8499 })).toBe(true)
    expect(sameCity({ latitude: 45.75, longitude: 4.85 }, { latitude: 48.85, longitude: 2.35 })).toBe(false)
  })
})
