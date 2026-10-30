import { Droplets, LoaderCircle, MapPin, Plus, RefreshCw, Search, Star, Sunrise, Sunset, Thermometer, Trash2, Wind, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { IconButton } from '../../components/IconButton'
import { inputBase } from '../../components/Modal'
import { formatClockTime, formatRelative } from '../../lib/time'
import { useNowMinute } from '../../lib/useNow'
import { dayLabel, hourLabel, nextHours, searchCities, today } from './api'
import { condition, formatTemperature, skyGradient } from './codes'
import { defaultCity, useCities, useCityActions, useForecast } from './data'
import type { CityCandidate, Forecast, WeatherCity } from './types'
import { WeatherIcon } from './WeatherIcon'

function placeLabel(city: Pick<WeatherCity, 'admin1' | 'country'>): string {
  return [city.admin1, city.country].filter(Boolean).join(', ')
}

/** Recherche de ville (Open-Meteo), résultats au fil de la frappe. */
function CitySearch({ onPick, onClose }: { onPick: (city: CityCandidate) => void; onClose?: () => void }) {
  const [query, setQuery] = useState('')
  // Résultats avec la recherche qui les a produits (pas de « aucune ville » avant la réponse).
  const [found, setFound] = useState<{ query: string; cities: CityCandidate[] }>({ query: '', cities: [] })
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setState('loading')
      searchCities(text, controller.signal)
        .then((cities) => {
          setFound({ query: text, cities })
          setState('idle')
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') setState('error')
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // Moins de 2 lettres : pas de recherche, rien à afficher.
  const active = query.trim().length >= 2
  const results = found.cities

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Rechercher une ville"
            placeholder="Rechercher une ville (ex. Lyon)"
            className={`${inputBase} pl-9`}
          />
        </div>
        {onClose && (
          <IconButton label="Fermer la recherche" onClick={onClose}>
            <X aria-hidden className="size-5" />
          </IconButton>
        )}
      </div>
      {active && state === 'loading' && (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <LoaderCircle aria-hidden className="size-4 animate-spin" /> Recherche…
        </p>
      )}
      {active && state === 'error' && <p className="mt-2 text-sm text-danger">Recherche impossible. Vérifie ta connexion.</p>}
      {active && state === 'idle' && found.query === query.trim() && results.length === 0 && <p className="mt-2 text-sm text-muted">Aucune ville trouvée.</p>}
      {active && results.length > 0 && (
        <ul aria-label="Villes trouvées" className="mt-2 divide-y divide-border">
          {results.map((city) => (
            <li key={`${city.latitude},${city.longitude}`}>
              <button type="button" onClick={() => onPick(city)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                <MapPin aria-hidden className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{city.name}</span>
                  <span className="block truncate text-xs text-muted">{placeLabel(city)}</span>
                </span>
                <Plus aria-hidden className="size-4 shrink-0 text-accent" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Hero({ city, forecast, onFavorite, onRemove }: { city: WeatherCity; forecast: Forecast; onFavorite: () => void; onRemove: () => void }) {
  const { current } = forecast
  const day = today(forecast)
  return (
    <section className="rounded-3xl p-5 text-white shadow-soft" style={{ background: skyGradient(current.code, current.isDay) }}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-2xl font-semibold">{city.name}</h2>
          <p className="truncate text-sm opacity-80">{placeLabel(city)}</p>
        </div>
        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={city.is_favorite}
          aria-label={city.is_favorite ? 'Ville favorite' : 'Définir comme ville favorite'}
          title={city.is_favorite ? 'Ville favorite (affichée par défaut)' : 'Définir comme ville favorite'}
          className="grid size-11 place-items-center rounded-full hover:bg-white/15"
        >
          <Star aria-hidden className={`size-5 ${city.is_favorite ? 'fill-current' : ''}`} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Retirer ${city.name}`}
          title="Retirer cette ville"
          className="grid size-11 place-items-center rounded-full hover:bg-white/15"
        >
          <Trash2 aria-hidden className="size-5" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <WeatherIcon code={current.code} isDay={current.isDay} aria-hidden className="size-16" />
          <span className="text-6xl font-light">{formatTemperature(current.temperature)}</span>
        </div>
        <div>
          <p className="text-lg font-medium">{condition(current.code).label}</p>
          {day && <p className="opacity-90">{`Max ${formatTemperature(day.max)} · Min ${formatTemperature(day.min)}`}</p>}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Thermometer aria-hidden className="size-4 shrink-0" />
          <dt className="sr-only">Ressenti</dt>
          <dd>Ressenti {formatTemperature(current.apparent)}</dd>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Wind aria-hidden className="size-4 shrink-0" />
          <dt className="sr-only">Vent</dt>
          <dd>{Math.round(current.wind)} km/h</dd>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Droplets aria-hidden className="size-4 shrink-0" />
          <dt className="sr-only">Humidité</dt>
          <dd>Humidité {Math.round(current.humidity)} %</dd>
        </div>
        {day?.sunrise && (
          <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            {current.isDay ? <Sunset aria-hidden className="size-4 shrink-0" /> : <Sunrise aria-hidden className="size-4 shrink-0" />}
            <dt className="sr-only">{current.isDay ? 'Coucher du soleil' : 'Lever du soleil'}</dt>
            <dd>{formatClockTime((current.isDay ? day.sunset : day.sunrise).slice(11, 16))}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

function Hourly({ forecast }: { forecast: Forecast }) {
  const hours = nextHours(forecast, 25)
  return (
    <section aria-labelledby="meteo-heures" className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <h3 id="meteo-heures" className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        Prochaines heures
      </h3>
      <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {hours.map((hour, index) => {
          return (
            <li key={hour.time} className="flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-sm odd:bg-surface-2/60">
              <span className="text-xs text-muted">{index === 0 ? 'Maint.' : hourLabel(hour.time)}</span>
              <WeatherIcon code={hour.code} isDay={hour.isDay} aria-hidden className="size-6" />
              <span className="font-medium">{formatTemperature(hour.temperature)}</span>
              <span className={`flex items-center gap-0.5 text-xs ${hour.precipitation >= 30 ? 'text-accent' : 'text-muted'}`}>
                <Droplets aria-hidden className="size-3" />
                {hour.precipitation} %
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Daily({ forecast }: { forecast: Forecast }) {
  const todayDate = forecast.current.time.slice(0, 10)
  const low = Math.min(...forecast.daily.map((day) => day.min))
  const high = Math.max(...forecast.daily.map((day) => day.max))
  const span = Math.max(1, high - low)
  return (
    <section aria-labelledby="meteo-jours" className="rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <h3 id="meteo-jours" className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">
        Prochains jours
      </h3>
      <ul className="divide-y divide-border">
        {forecast.daily.map((day) => {
          return (
            <li key={day.date} className="grid grid-cols-[minmax(5.75rem,1fr)_1.75rem_2.25rem_minmax(2.5rem,2fr)_2.25rem] items-center gap-1.5 py-2 text-sm sm:grid-cols-[minmax(6.5rem,1fr)_2rem_3.5rem_2.5rem_minmax(3rem,2fr)_2.5rem] sm:gap-2">
              <span className="truncate font-medium first-letter:uppercase">{dayLabel(day.date, todayDate)}</span>
              <WeatherIcon code={day.code} role="img" aria-label={condition(day.code).label} className="size-6" />
              <span className={`hidden items-center gap-0.5 text-xs sm:flex ${day.precipitation >= 30 ? 'text-accent' : 'text-muted'}`}>
                <Droplets aria-hidden className="size-3" />
                {day.precipitation} %
              </span>
              <span className="text-right text-muted">{formatTemperature(day.min)}</span>
              <span aria-hidden className="relative h-1.5 rounded-full bg-surface-2">
                <span
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                  style={{ left: `${((day.min - low) / span) * 100}%`, right: `${((high - day.max) / span) * 100}%` }}
                />
              </span>
              <span className="font-medium">{formatTemperature(day.max)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function CityForecast({ city, onFavorite, onRemove }: { city: WeatherCity; onFavorite: () => void; onRemove: () => void }) {
  const forecast = useForecast(city)
  const now = useNowMinute()
  if (!forecast.data) {
    return (
      <div className="grid min-h-60 place-items-center rounded-3xl border border-border bg-surface text-sm text-muted">
        {forecast.isError ? (
          <span className="text-center">
            Météo indisponible pour le moment.
            <button type="button" onClick={() => void forecast.refetch()} className="mt-2 block w-full font-medium text-accent">
              Réessayer
            </button>
          </span>
        ) : (
          <LoaderCircle aria-label="Chargement de la météo" className="size-6 animate-spin" />
        )}
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <Hero city={city} forecast={forecast.data} onFavorite={onFavorite} onRemove={onRemove} />
      <Hourly forecast={forecast.data} />
      <Daily forecast={forecast.data} />
      <p className="flex items-center justify-center gap-2 text-xs text-muted">
        Mis à jour {formatRelative(new Date(forecast.data.fetchedAt), now)} · Open-Meteo
        <button
          type="button"
          onClick={() => void forecast.refetch()}
          aria-label="Actualiser la météo"
          title="Actualiser"
          className="grid size-9 place-items-center rounded-full hover:bg-surface-2"
        >
          <RefreshCw aria-hidden className={`size-4 ${forecast.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`} />
        </button>
      </p>
    </div>
  )
}

export default function WeatherPage() {
  const [params, setParams] = useSearchParams()
  const { cities, loaded } = useCities()
  const { addCity, setFavorite, removeCity } = useCityActions(cities)
  const [searching, setSearching] = useState(false)
  const selected = cities.find((city) => city.id === params.get('city')) ?? defaultCity(cities)

  const select = (city: WeatherCity) => setParams({ city: city.id }, { replace: true })
  const pick = (candidate: CityCandidate) => {
    select(addCity(candidate))
    setSearching(false)
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
        {loaded && cities.length === 0 ? (
          <div className="space-y-3">
            <p className="text-center text-muted">Ajoute une ville pour voir sa météo actuelle et ses prévisions.</p>
            <CitySearch onPick={pick} />
          </div>
        ) : (
          <>
            <nav aria-label="Mes villes" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {cities.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => select(city)}
                  aria-current={city.id === selected?.id ? 'true' : undefined}
                  className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-2 aria-[current]:border-accent aria-[current]:bg-accent aria-[current]:text-accent-contrast"
                >
                  {city.is_favorite && <Star aria-label="favorite" className="size-3.5 fill-current" />}
                  {city.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSearching(true)}
                className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border px-4 text-sm font-medium text-muted hover:bg-surface-2"
              >
                <Plus aria-hidden className="size-4" />
                Ajouter une ville
              </button>
            </nav>
            {searching && <CitySearch onPick={pick} onClose={() => setSearching(false)} />}
            {selected && (
              <CityForecast
                key={selected.id}
                city={selected}
                onFavorite={() => setFavorite(selected)}
                onRemove={() => {
                  if (confirm(`Retirer ${selected.name} de tes villes ?`)) {
                    removeCity(selected)
                    setParams({}, { replace: true })
                  }
                }}
              />
            )}
          </>
        )}
    </div>
  )
}
