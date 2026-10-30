import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useDeleteRows, useRows, useSaveRows } from '../../data/rows'
import { fetchForecast } from './api'
import type { CityCandidate, WeatherCity } from './types'

/** Villes enregistrées, dans l'ordre d'ajout. */
export function useCities() {
  const query = useRows<WeatherCity>('weather_cities')
  const cities = useMemo(() => [...(query.data ?? [])].sort((a, b) => a.position - b.position), [query.data])
  return { cities, loaded: query.isSuccess }
}

/** Ville affichée par défaut : la favorite, sinon la première. */
export function defaultCity(cities: WeatherCity[]): WeatherCity | undefined {
  return cities.find((city) => city.is_favorite) ?? cities[0]
}

/** Même ville (à quelques centaines de mètres près). */
export function sameCity(a: Pick<WeatherCity, 'latitude' | 'longitude'>, b: Pick<WeatherCity, 'latitude' | 'longitude'>): boolean {
  return Math.abs(a.latitude - b.latitude) < 0.01 && Math.abs(a.longitude - b.longitude) < 0.01
}

/**
 * Prévisions d'une ville : rafraîchies toutes les 30 min, gardées en cache (affichage hors-ligne
 * avec les dernières données reçues).
 */
export function useForecast(city: Pick<WeatherCity, 'latitude' | 'longitude'> | undefined) {
  return useQuery({
    queryKey: ['weather', city?.latitude, city?.longitude],
    queryFn: () => fetchForecast(city!.latitude, city!.longitude),
    enabled: Boolean(city),
    staleTime: 10 * 60_000,
    refetchInterval: 30 * 60_000,
  })
}

export function useCityActions(cities: WeatherCity[]) {
  const save = useSaveRows<WeatherCity>('weather_cities')
  const remove = useDeleteRows('weather_cities')

  /** Ajoute une ville (la première devient favorite). Renvoie la ville, ou celle déjà enregistrée. */
  const addCity = useCallback(
    (candidate: CityCandidate): WeatherCity => {
      const existing = cities.find((city) => sameCity(city, candidate))
      if (existing) return existing
      const city: WeatherCity = { ...candidate, id: crypto.randomUUID(), position: Date.now(), is_favorite: cities.length === 0 }
      save.mutate([city])
      return city
    },
    [cities, save],
  )

  /** Une seule favorite à la fois. */
  const setFavorite = useCallback(
    (favorite: WeatherCity) => {
      const changed = cities.filter((city) => city.is_favorite !== (city.id === favorite.id)).map((city) => ({ ...city, is_favorite: city.id === favorite.id }))
      if (changed.length) save.mutate(changed)
    },
    [cities, save],
  )

  /** Retire une ville ; si c'était la favorite, la suivante prend sa place. */
  const removeCity = useCallback(
    (city: WeatherCity) => {
      remove.mutate([city.id])
      const rest = cities.filter((other) => other.id !== city.id)
      if (city.is_favorite && rest.length) save.mutate([{ ...rest[0], is_favorite: true }])
    },
    [cities, remove, save],
  )

  return { addCity, setFavorite, removeCity }
}
