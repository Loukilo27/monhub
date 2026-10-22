// Outils web gratuits et sans clé pour l'assistant (la recherche Google de Gemini n'est pas
// incluse dans l'offre gratuite) : actualités (flux Google News), Wikipédia, météo (Open-Meteo).
// Les fonctions d'analyse sont pures et testées (webTools.test.ts).

export interface Source {
  title: string
  url: string
}

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/** Articles d'un flux RSS Google News : titre, lien, date, média. */
export function parseNewsRss(xml: string, limit = 6): { title: string; url: string; date: string; source: string }[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, limit)
  const field = (item: string, tag: string) => decodeEntities(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1] ?? '').trim()
  return items.map(([, item]) => ({
    title: field(item, 'title'),
    url: field(item, 'link'),
    date: field(item, 'pubDate'),
    source: field(item, 'source'),
  }))
}

/** Codes météo WMO → libellé français. */
export function weatherLabel(code: number): string {
  if (code === 0) return 'ciel dégagé'
  if (code <= 2) return 'peu nuageux'
  if (code === 3) return 'couvert'
  if (code <= 48) return 'brouillard'
  if (code <= 57) return 'bruine'
  if (code <= 67) return 'pluie'
  if (code <= 77) return 'neige'
  if (code <= 82) return 'averses'
  if (code <= 86) return 'averses de neige'
  return 'orage'
}

const HEADERS = { 'User-Agent': 'MonHub/1.0 (tableau de bord personnel)' }

async function getJson(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { headers: HEADERS })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** Recherche : dernières actualités + résumés Wikipédia, avec leurs sources. */
export async function searchWeb(question: string): Promise<{ resultats: Record<string, unknown>; sources: Source[] }> {
  const query = encodeURIComponent(question)
  const [news, wiki] = await Promise.allSettled([
    fetch(`https://news.google.com/rss/search?q=${query}&hl=fr&gl=FR&ceid=FR:fr`, { headers: HEADERS }).then((response) => response.text()).then((xml) => parseNewsRss(xml)),
    (async () => {
      const search = await getJson(`https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=${query}&srlimit=2&format=json&origin=*`)
      const titles = ((search.query as { search?: { title: string }[] } | undefined)?.search ?? []).map((item) => item.title)
      const pages = await Promise.all(
        titles.map(async (title) => {
          const summary = await getJson(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
          return {
            title: String(summary.title ?? title),
            extrait: String(summary.extract ?? ''),
            url: String((summary.content_urls as { desktop?: { page?: string } } | undefined)?.desktop?.page ?? `https://fr.wikipedia.org/wiki/${encodeURIComponent(title)}`),
          }
        }),
      )
      return pages
    })(),
  ])
  const articles = news.status === 'fulfilled' ? news.value : []
  const pages = wiki.status === 'fulfilled' ? wiki.value : []
  return {
    resultats: {
      actualites: articles.map((article) => ({ titre: article.title, media: article.source, date: article.date })),
      wikipedia: pages.map((page) => ({ titre: page.title, extrait: page.extrait })),
      remarque: 'Résultats bruts : réponds à partir de ces éléments, et dis-le si rien ne correspond.',
    },
    sources: [
      ...articles.slice(0, 4).map((article) => ({ title: article.source ? `${article.title}` : article.title, url: article.url })),
      ...pages.map((page) => ({ title: `${page.title} — Wikipédia`, url: page.url })),
    ],
  }
}

/** Météo actuelle et prévisions (Open-Meteo, gratuit, sans clé). */
export async function weather(place: string, timeZone: string): Promise<{ resultats: Record<string, unknown>; sources: Source[] }> {
  const geo = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=fr&format=json`)
  const location = (geo.results as { name: string; latitude: number; longitude: number; country?: string; admin1?: string }[] | undefined)?.[0]
  if (!location) return { resultats: { erreur: `Lieu « ${place} » introuvable.` }, sources: [] }
  const forecast = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
      '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
      `&forecast_days=4&timezone=${encodeURIComponent(timeZone)}`,
  )
  const current = forecast.current as Record<string, number>
  const daily = forecast.daily as Record<string, (number | string)[]>
  return {
    resultats: {
      lieu: [location.name, location.admin1, location.country].filter(Boolean).join(', '),
      maintenant: {
        temperature: `${Math.round(current.temperature_2m)} °C`,
        ressenti: `${Math.round(current.apparent_temperature)} °C`,
        ciel: weatherLabel(current.weather_code),
        vent: `${Math.round(current.wind_speed_10m)} km/h`,
      },
      previsions: (daily.time as string[]).map((date, index) => ({
        date,
        ciel: weatherLabel(Number(daily.weather_code[index])),
        min: `${Math.round(Number(daily.temperature_2m_min[index]))} °C`,
        max: `${Math.round(Number(daily.temperature_2m_max[index]))} °C`,
        pluie: `${daily.precipitation_probability_max[index]} %`,
      })),
    },
    sources: [{ title: 'Open-Meteo', url: 'https://open-meteo.com/' }],
  }
}
