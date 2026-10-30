import { addDays } from '../../../supabase/functions/_shared/recurrence'
import { hourCycle } from '../../lib/time'
import type { CityCandidate, DayForecast, Forecast, HourForecast } from './types'

/**
 * Open-Meteo : prévisions et recherche de villes gratuites, sans clé ni compte.
 * Appelé directement par l'app (aucune donnée personnelle envoyée, seulement des coordonnées).
 * https://open-meteo.com/en/docs
 */
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export function forecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
    hourly: 'temperature_2m,weather_code,is_day,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: '7',
  })
  return `${FORECAST_URL}?${params}`
}

type Raw = Record<string, Record<string, unknown> | undefined>
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const list = (source: Record<string, unknown> | undefined, key: string): unknown[] => (Array.isArray(source?.[key]) ? (source[key] as unknown[]) : [])

/** Réponse Open-Meteo → prévisions (fonction pure, testée). */
export function parseForecast(raw: Raw, fetchedAt = new Date()): Forecast {
  const current = raw.current
  if (!current || typeof current.time !== 'string') throw new Error('Prévisions illisibles.')
  const hourly = raw.hourly
  const daily = raw.daily
  return {
    current: {
      time: current.time,
      temperature: num(current.temperature_2m),
      apparent: num(current.apparent_temperature),
      code: num(current.weather_code),
      isDay: current.is_day !== 0,
      wind: num(current.wind_speed_10m),
      humidity: num(current.relative_humidity_2m),
    },
    hourly: list(hourly, 'time').map(
      (time, index): HourForecast => ({
        time: String(time),
        temperature: num(list(hourly, 'temperature_2m')[index]),
        code: num(list(hourly, 'weather_code')[index]),
        isDay: list(hourly, 'is_day')[index] !== 0,
        precipitation: num(list(hourly, 'precipitation_probability')[index]),
      }),
    ),
    daily: list(daily, 'time').map(
      (date, index): DayForecast => ({
        date: String(date),
        code: num(list(daily, 'weather_code')[index]),
        min: num(list(daily, 'temperature_2m_min')[index]),
        max: num(list(daily, 'temperature_2m_max')[index]),
        precipitation: num(list(daily, 'precipitation_probability_max')[index]),
        sunrise: String(list(daily, 'sunrise')[index] ?? ''),
        sunset: String(list(daily, 'sunset')[index] ?? ''),
      }),
    ),
    fetchedAt: fetchedAt.toISOString(),
  }
}

/**
 * Les prochaines heures à partir de l'heure en cours (heure locale de la ville).
 * Comparaison des heures locales « AAAA-MM-JJTHH » : indépendante du fuseau de l'appareil.
 */
export function nextHours(forecast: Forecast, count: number): HourForecast[] {
  const currentHour = forecast.current.time.slice(0, 13)
  const start = forecast.hourly.findIndex((hour) => hour.time.slice(0, 13) >= currentHour)
  return start < 0 ? [] : forecast.hourly.slice(start, start + count)
}

/** Prévisions du jour en cours de la ville (min / max). */
export function today(forecast: Forecast): DayForecast | undefined {
  return forecast.daily.find((day) => day.date === forecast.current.time.slice(0, 10))
}

/** Heure courte d'une prévision : « 15 h » (ou « 3 PM » au format 12 h). */
export function hourLabel(time: string): string {
  const hour = Number(time.slice(11, 13))
  if (hourCycle() === 'h12') return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
  return `${hour} h`
}

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })

/** « Aujourd’hui », « Demain », « samedi 1 ». */
export function dayLabel(date: string, todayDate: string): string {
  if (date === todayDate) return 'Aujourd’hui'
  if (date === addDays(todayDate, 1)) return 'Demain'
  return WEEKDAY.format(new Date(`${date}T12:00:00Z`))
}

export async function fetchForecast(latitude: number, longitude: number): Promise<Forecast> {
  const response = await fetch(forecastUrl(latitude, longitude))
  if (!response.ok) throw new Error(`Météo indisponible (${response.status}).`)
  return parseForecast((await response.json()) as Raw)
}

/** Résultats de recherche Open-Meteo → villes (fonction pure, testée). */
export function parseGeocoding(raw: { results?: Record<string, unknown>[] }): CityCandidate[] {
  return (raw.results ?? [])
    .filter((item) => typeof item.name === 'string' && typeof item.latitude === 'number' && typeof item.longitude === 'number')
    .map((item) => ({
      name: item.name as string,
      admin1: typeof item.admin1 === 'string' ? item.admin1 : '',
      country: typeof item.country === 'string' ? item.country : '',
      latitude: item.latitude as number,
      longitude: item.longitude as number,
      timezone: typeof item.timezone === 'string' ? item.timezone : 'auto',
    }))
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CityCandidate[]> {
  const params = new URLSearchParams({ name: query, count: '8', language: 'fr', format: 'json' })
  const response = await fetch(`${GEOCODING_URL}?${params}`, { signal })
  if (!response.ok) throw new Error(`Recherche indisponible (${response.status}).`)
  return parseGeocoding((await response.json()) as { results?: Record<string, unknown>[] })
}
