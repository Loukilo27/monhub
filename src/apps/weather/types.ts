/** Ligne de la table weather_cities. */
export interface WeatherCity {
  id: string
  name: string
  /** Région (« Île-de-France »), vide si inconnue. */
  admin1: string
  country: string
  latitude: number
  longitude: number
  /** Fuseau de la ville (« Europe/Paris »). */
  timezone: string
  position: number
  is_favorite: boolean
}

/** Résultat de la recherche de ville. */
export type CityCandidate = Omit<WeatherCity, 'id' | 'position' | 'is_favorite'>

export interface HourForecast {
  /** Heure locale de la ville, « AAAA-MM-JJTHH:MM ». */
  time: string
  temperature: number
  code: number
  isDay: boolean
  /** Probabilité de pluie, en %. */
  precipitation: number
}

export interface DayForecast {
  /** « AAAA-MM-JJ », jour local de la ville. */
  date: string
  code: number
  min: number
  max: number
  precipitation: number
  /** Heures locales « AAAA-MM-JJTHH:MM ». */
  sunrise: string
  sunset: string
}

export interface Forecast {
  current: {
    /** Heure locale de la ville, « AAAA-MM-JJTHH:MM ». */
    time: string
    temperature: number
    apparent: number
    code: number
    isDay: boolean
    /** km/h */
    wind: number
    /** % */
    humidity: number
  }
  hourly: HourForecast[]
  daily: DayForecast[]
  /** Heure de récupération (ISO). */
  fetchedAt: string
}
