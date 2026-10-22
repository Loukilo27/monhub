/** Villes proposées pour les fuseaux horaires (noms français). Tout fuseau IANA reste accessible par la recherche. */
export const CITIES: { label: string; timeZone: string; country: string }[] = [
  { label: 'Paris', timeZone: 'Europe/Paris', country: 'France' },
  { label: 'Londres', timeZone: 'Europe/London', country: 'Royaume-Uni' },
  { label: 'Dublin', timeZone: 'Europe/Dublin', country: 'Irlande' },
  { label: 'Lisbonne', timeZone: 'Europe/Lisbon', country: 'Portugal' },
  { label: 'Madrid', timeZone: 'Europe/Madrid', country: 'Espagne' },
  { label: 'Bruxelles', timeZone: 'Europe/Brussels', country: 'Belgique' },
  { label: 'Genève', timeZone: 'Europe/Zurich', country: 'Suisse' },
  { label: 'Berlin', timeZone: 'Europe/Berlin', country: 'Allemagne' },
  { label: 'Rome', timeZone: 'Europe/Rome', country: 'Italie' },
  { label: 'Amsterdam', timeZone: 'Europe/Amsterdam', country: 'Pays-Bas' },
  { label: 'Stockholm', timeZone: 'Europe/Stockholm', country: 'Suède' },
  { label: 'Varsovie', timeZone: 'Europe/Warsaw', country: 'Pologne' },
  { label: 'Athènes', timeZone: 'Europe/Athens', country: 'Grèce' },
  { label: 'Helsinki', timeZone: 'Europe/Helsinki', country: 'Finlande' },
  { label: 'Istanbul', timeZone: 'Europe/Istanbul', country: 'Turquie' },
  { label: 'Moscou', timeZone: 'Europe/Moscow', country: 'Russie' },
  { label: 'Le Caire', timeZone: 'Africa/Cairo', country: 'Égypte' },
  { label: 'Casablanca', timeZone: 'Africa/Casablanca', country: 'Maroc' },
  { label: 'Alger', timeZone: 'Africa/Algiers', country: 'Algérie' },
  { label: 'Tunis', timeZone: 'Africa/Tunis', country: 'Tunisie' },
  { label: 'Dakar', timeZone: 'Africa/Dakar', country: 'Sénégal' },
  { label: 'Abidjan', timeZone: 'Africa/Abidjan', country: 'Côte d’Ivoire' },
  { label: 'Lagos', timeZone: 'Africa/Lagos', country: 'Nigeria' },
  { label: 'Nairobi', timeZone: 'Africa/Nairobi', country: 'Kenya' },
  { label: 'Johannesburg', timeZone: 'Africa/Johannesburg', country: 'Afrique du Sud' },
  { label: 'Dubaï', timeZone: 'Asia/Dubai', country: 'Émirats arabes unis' },
  { label: 'Jérusalem', timeZone: 'Asia/Jerusalem', country: 'Israël' },
  { label: 'Riyad', timeZone: 'Asia/Riyadh', country: 'Arabie saoudite' },
  { label: 'Téhéran', timeZone: 'Asia/Tehran', country: 'Iran' },
  { label: 'Karachi', timeZone: 'Asia/Karachi', country: 'Pakistan' },
  { label: 'Mumbai', timeZone: 'Asia/Kolkata', country: 'Inde' },
  { label: 'New Delhi', timeZone: 'Asia/Kolkata', country: 'Inde' },
  { label: 'Katmandou', timeZone: 'Asia/Kathmandu', country: 'Népal' },
  { label: 'Dacca', timeZone: 'Asia/Dhaka', country: 'Bangladesh' },
  { label: 'Bangkok', timeZone: 'Asia/Bangkok', country: 'Thaïlande' },
  { label: 'Hanoï', timeZone: 'Asia/Ho_Chi_Minh', country: 'Viêt Nam' },
  { label: 'Singapour', timeZone: 'Asia/Singapore', country: 'Singapour' },
  { label: 'Hong Kong', timeZone: 'Asia/Hong_Kong', country: 'Chine' },
  { label: 'Pékin', timeZone: 'Asia/Shanghai', country: 'Chine' },
  { label: 'Shanghai', timeZone: 'Asia/Shanghai', country: 'Chine' },
  { label: 'Taipei', timeZone: 'Asia/Taipei', country: 'Taïwan' },
  { label: 'Séoul', timeZone: 'Asia/Seoul', country: 'Corée du Sud' },
  { label: 'Tokyo', timeZone: 'Asia/Tokyo', country: 'Japon' },
  { label: 'Manille', timeZone: 'Asia/Manila', country: 'Philippines' },
  { label: 'Jakarta', timeZone: 'Asia/Jakarta', country: 'Indonésie' },
  { label: 'Perth', timeZone: 'Australia/Perth', country: 'Australie' },
  { label: 'Sydney', timeZone: 'Australia/Sydney', country: 'Australie' },
  { label: 'Melbourne', timeZone: 'Australia/Melbourne', country: 'Australie' },
  { label: 'Auckland', timeZone: 'Pacific/Auckland', country: 'Nouvelle-Zélande' },
  { label: 'Nouméa', timeZone: 'Pacific/Noumea', country: 'Nouvelle-Calédonie' },
  { label: 'Papeete', timeZone: 'Pacific/Tahiti', country: 'Polynésie française' },
  { label: 'Honolulu', timeZone: 'Pacific/Honolulu', country: 'États-Unis' },
  { label: 'Anchorage', timeZone: 'America/Anchorage', country: 'États-Unis' },
  { label: 'Los Angeles', timeZone: 'America/Los_Angeles', country: 'États-Unis' },
  { label: 'San Francisco', timeZone: 'America/Los_Angeles', country: 'États-Unis' },
  { label: 'Vancouver', timeZone: 'America/Vancouver', country: 'Canada' },
  { label: 'Denver', timeZone: 'America/Denver', country: 'États-Unis' },
  { label: 'Mexico', timeZone: 'America/Mexico_City', country: 'Mexique' },
  { label: 'Chicago', timeZone: 'America/Chicago', country: 'États-Unis' },
  { label: 'New York', timeZone: 'America/New_York', country: 'États-Unis' },
  { label: 'Toronto', timeZone: 'America/Toronto', country: 'Canada' },
  { label: 'Montréal', timeZone: 'America/Toronto', country: 'Canada' },
  { label: 'Pointe-à-Pitre', timeZone: 'America/Guadeloupe', country: 'Guadeloupe' },
  { label: 'Fort-de-France', timeZone: 'America/Martinique', country: 'Martinique' },
  { label: 'Cayenne', timeZone: 'America/Cayenne', country: 'Guyane' },
  { label: 'Bogota', timeZone: 'America/Bogota', country: 'Colombie' },
  { label: 'Lima', timeZone: 'America/Lima', country: 'Pérou' },
  { label: 'Santiago', timeZone: 'America/Santiago', country: 'Chili' },
  { label: 'Buenos Aires', timeZone: 'America/Argentina/Buenos_Aires', country: 'Argentine' },
  { label: 'São Paulo', timeZone: 'America/Sao_Paulo', country: 'Brésil' },
  { label: 'Rio de Janeiro', timeZone: 'America/Sao_Paulo', country: 'Brésil' },
  { label: 'Saint-Denis (La Réunion)', timeZone: 'Indian/Reunion', country: 'La Réunion' },
  { label: 'Mayotte', timeZone: 'Indian/Mayotte', country: 'Mayotte' },
  { label: 'Reykjavik', timeZone: 'Atlantic/Reykjavik', country: 'Islande' },
  { label: 'UTC', timeZone: 'UTC', country: 'Temps universel' },
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Recherche dans les villes connues puis dans tous les fuseaux IANA du navigateur. */
export function searchCities(query: string, limit = 12): { label: string; timeZone: string; country: string }[] {
  const needle = normalize(query.trim())
  if (!needle) return CITIES.slice(0, limit)
  const known = CITIES.filter((city) => normalize(`${city.label} ${city.country}`).includes(needle))
  const zones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const extra = zones
    .filter((zone) => normalize(zone.replace(/_/g, ' ')).includes(needle) && !known.some((city) => city.timeZone === zone))
    .map((zone) => ({ label: zone.split('/').pop()!.replace(/_/g, ' '), timeZone: zone, country: zone.split('/')[0] }))
  return [...known, ...extra].slice(0, limit)
}
