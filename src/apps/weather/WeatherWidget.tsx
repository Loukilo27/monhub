import { ChevronRight, CloudOff, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { WidgetProps } from '../types'
import { hourLabel, nextHours, today } from './api'
import { condition, formatTemperature, skyGradient } from './codes'
import { defaultCity, useCities, useForecast } from './data'
import { WeatherIcon } from './WeatherIcon'

/**
 * Widget Météo (2×2, 4×2, 4×1) : la ville favorite par défaut, la flèche passe à la ville suivante
 * (choix enregistré avec le widget). Météo actuelle et prochaines heures.
 */
export default function WeatherWidget({ size, config, onConfigChange }: WidgetProps) {
  const navigate = useNavigate()
  const { cities, loaded } = useCities()
  const [localId, setLocalId] = useState<string>()
  const selectedId = (config?.cityId as string | undefined) ?? localId
  const city = cities.find((candidate) => candidate.id === selectedId) ?? defaultCity(cities)
  const forecast = useForecast(city)

  if (!loaded) return null
  if (!city) {
    return (
      <div className="grid h-full place-items-center p-3 text-center text-sm text-muted">
        <span>
          <MapPin aria-hidden className="mx-auto mb-1 size-6" />
          Ajoute une ville dans l’appli Météo
        </span>
      </div>
    )
  }

  const showNext = () => {
    const nextCity = cities[(cities.indexOf(city) + 1) % cities.length]
    if (onConfigChange) onConfigChange({ cityId: nextCity.id })
    else setLocalId(nextCity.id)
  }

  const data = forecast.data
  const compact = size.h === 1
  // Heures suivantes (l'heure en cours est déjà affichée en grand).
  const hours = data ? nextHours(data, (compact ? 5 : size.w >= 4 ? 6 : 4) + 1).slice(1) : []
  const day = data && today(data)

  // Tailles proportionnelles au widget : un 2×2 est carré, un 4×2 deux fois plus large, un 4×1 très allongé.
  const wide = size.w >= 4
  const text = {
    city: wide ? 'text-[min(10cqh,6cqw)]' : 'text-[min(10cqh,10cqw)]',
    icon: wide ? 'size-[min(24cqh,14cqw)]' : 'size-[min(24cqh,24cqw)]',
    temperature: wide ? 'text-[min(26cqh,15cqw)]' : 'text-[min(26cqh,26cqw)]',
    label: 'text-[min(8.5cqh,8.5cqw)]',
    hour: compact ? 'text-[min(15cqh,3.6cqw)]' : wide ? 'text-[min(9cqh,4.5cqw)]' : 'text-[min(9cqh,9cqw)]',
  }

  const currentIcon = (className: string) =>
    data ? <WeatherIcon code={data.current.code} isDay={data.current.isDay} aria-hidden className={className} /> : <CloudOff aria-hidden className={className} />

  const arrow = cities.length > 1 && (
    <button
      type="button"
      data-widget-action
      onClick={showNext}
      aria-label={`Ville suivante (${cities.length} villes)`}
      title="Ville suivante"
      className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
    >
      <ChevronRight aria-hidden className="size-4" />
    </button>
  )

  const hourList = (
    <ul className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${Math.max(hours.length, 1)}, minmax(0, 1fr))` }}>
      {hours.map((hour) => {
        return (
          <li key={hour.time} className={`flex flex-col items-center gap-[2cqh] ${text.hour}`}>
            <span className="opacity-80">{hourLabel(hour.time)}</span>
            <WeatherIcon code={hour.code} isDay={hour.isDay} aria-hidden className="size-[1.6em]" />
            <span className="font-medium">{formatTemperature(hour.temperature)}</span>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div className="relative h-full text-white" style={{ background: data ? skyGradient(data.current.code, data.current.isDay) : skyGradient(3, true) }}>
      <button
        type="button"
        data-widget-action
        onClick={() => navigate(`/app/weather?city=${city.id}`, { viewTransition: true })}
        aria-label={`Météo de ${city.name}${data ? ` : ${condition(data.current.code).label}, ${formatTemperature(data.current.temperature)}` : ''}`}
        className={`flex h-full w-full text-left ${compact ? 'items-center gap-[3cqw] px-[4cqw] pr-12' : 'flex-col p-[max(0.75rem,6cqh)]'}`}
      >
        {compact ? (
          <>
            {currentIcon('size-[42cqh] shrink-0')}
            <span className="flex shrink-0 flex-col">
              <span className="text-[min(34cqh,8cqw)] leading-none font-light">{data ? formatTemperature(data.current.temperature) : '–'}</span>
              <span className="max-w-[22cqw] truncate text-[min(16cqh,3.4cqw)] font-medium">{city.name}</span>
            </span>
            {hourList}
          </>
        ) : (
          <>
            <span className={`flex items-center gap-1 truncate pr-9 font-semibold ${text.city}`}>
              <MapPin aria-hidden className="size-[0.9em] shrink-0" />
              <span className="truncate">{city.name}</span>
            </span>
            <span className="mt-[2cqh] flex items-center gap-[3cqw]">
              {currentIcon(`${text.icon} shrink-0`)}
              <span className={`leading-none font-light ${text.temperature}`}>{data ? formatTemperature(data.current.temperature) : '–'}</span>
              {size.w >= 4 && data && (
                <span className="min-w-0 text-[min(9cqh,3.5cqw)] leading-snug">
                  <span className="block truncate font-medium">{condition(data.current.code).label}</span>
                  {day && <span className="block opacity-80">{`Max ${formatTemperature(day.max)} · Min ${formatTemperature(day.min)}`}</span>}
                </span>
              )}
            </span>
            {size.w < 4 && data && (
              <span className={`truncate opacity-90 ${text.label}`}>
                {condition(data.current.code).label}
                {day && ` · ${formatTemperature(day.max)} / ${formatTemperature(day.min)}`}
              </span>
            )}
            {!data && <span className={`opacity-90 ${text.label}`}>{forecast.isError ? 'Météo indisponible' : 'Chargement…'}</span>}
            <span className="mt-auto flex pt-[3cqh]">{hourList}</span>
          </>
        )}
      </button>
      <span className={`absolute right-1.5 ${compact ? 'top-1/2 -translate-y-1/2' : 'top-1.5'}`}>{arrow}</span>
    </div>
  )
}
