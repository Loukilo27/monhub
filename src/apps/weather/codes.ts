import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudSun,
  Moon,
  Snowflake,
  Sun,
  type LucideIcon,
} from 'lucide-react'

export type Sky = 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm'

interface Condition {
  label: string
  day: LucideIcon
  night: LucideIcon
  sky: Sky
}

/** Codes météo WMO renvoyés par Open-Meteo. */
const CONDITIONS: Record<number, Condition> = {
  0: { label: 'Ciel dégagé', day: Sun, night: Moon, sky: 'clear' },
  1: { label: 'Plutôt ensoleillé', day: Sun, night: Moon, sky: 'clear' },
  2: { label: 'Partiellement nuageux', day: CloudSun, night: CloudMoon, sky: 'cloudy' },
  3: { label: 'Couvert', day: Cloud, night: Cloud, sky: 'cloudy' },
  45: { label: 'Brouillard', day: CloudFog, night: CloudFog, sky: 'fog' },
  48: { label: 'Brouillard givrant', day: CloudFog, night: CloudFog, sky: 'fog' },
  51: { label: 'Bruine légère', day: CloudDrizzle, night: CloudDrizzle, sky: 'rain' },
  53: { label: 'Bruine', day: CloudDrizzle, night: CloudDrizzle, sky: 'rain' },
  55: { label: 'Bruine dense', day: CloudDrizzle, night: CloudDrizzle, sky: 'rain' },
  56: { label: 'Bruine verglaçante', day: CloudDrizzle, night: CloudDrizzle, sky: 'rain' },
  57: { label: 'Bruine verglaçante', day: CloudDrizzle, night: CloudDrizzle, sky: 'rain' },
  61: { label: 'Pluie faible', day: CloudRain, night: CloudRain, sky: 'rain' },
  63: { label: 'Pluie', day: CloudRain, night: CloudRain, sky: 'rain' },
  65: { label: 'Forte pluie', day: CloudRain, night: CloudRain, sky: 'rain' },
  66: { label: 'Pluie verglaçante', day: CloudRain, night: CloudRain, sky: 'rain' },
  67: { label: 'Pluie verglaçante', day: CloudRain, night: CloudRain, sky: 'rain' },
  71: { label: 'Neige faible', day: CloudSnow, night: CloudSnow, sky: 'snow' },
  73: { label: 'Neige', day: CloudSnow, night: CloudSnow, sky: 'snow' },
  75: { label: 'Forte neige', day: CloudSnow, night: CloudSnow, sky: 'snow' },
  77: { label: 'Grains de neige', day: Snowflake, night: Snowflake, sky: 'snow' },
  80: { label: 'Averses', day: CloudRain, night: CloudRain, sky: 'rain' },
  81: { label: 'Averses', day: CloudRain, night: CloudRain, sky: 'rain' },
  82: { label: 'Violentes averses', day: CloudRainWind, night: CloudRainWind, sky: 'rain' },
  85: { label: 'Averses de neige', day: CloudSnow, night: CloudSnow, sky: 'snow' },
  86: { label: 'Fortes averses de neige', day: CloudSnow, night: CloudSnow, sky: 'snow' },
  95: { label: 'Orage', day: CloudLightning, night: CloudLightning, sky: 'storm' },
  96: { label: 'Orage avec grêle', day: CloudHail, night: CloudHail, sky: 'storm' },
  99: { label: 'Orage avec grêle', day: CloudHail, night: CloudHail, sky: 'storm' },
}

const UNKNOWN: Condition = { label: 'Temps inconnu', day: Cloud, night: Cloud, sky: 'cloudy' }

export function condition(code: number): Condition {
  return CONDITIONS[code] ?? UNKNOWN
}

export function weatherIcon(code: number, isDay = true): LucideIcon {
  const found = condition(code)
  return isDay ? found.day : found.night
}

/** Fond dégradé selon le ciel et le moment (texte blanc lisible dessus). */
export function skyGradient(code: number, isDay: boolean): string {
  const sky = condition(code).sky
  if (!isDay) {
    if (sky === 'clear') return 'linear-gradient(160deg, #1e1b4b, #0f172a)'
    if (sky === 'storm') return 'linear-gradient(160deg, #1e1b2e, #3b0764)'
    return 'linear-gradient(160deg, #1e293b, #0f172a)'
  }
  switch (sky) {
    case 'clear':
      return 'linear-gradient(160deg, #38bdf8, #2563eb)'
    case 'cloudy':
      return 'linear-gradient(160deg, #64748b, #334155)'
    case 'fog':
      return 'linear-gradient(160deg, #94a3b8, #475569)'
    case 'rain':
      return 'linear-gradient(160deg, #475569, #1e3a8a)'
    case 'snow':
      return 'linear-gradient(160deg, #7dd3fc, #475569)'
    case 'storm':
      return 'linear-gradient(160deg, #334155, #4c1d95)'
  }
}

/** « 12° » (arrondi). */
export function formatTemperature(value: number): string {
  return `${Math.round(value)}°`
}
