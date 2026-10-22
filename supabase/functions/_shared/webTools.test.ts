import { describe, expect, it } from 'vitest'
import { parseNewsRss, weatherLabel } from './webTools'

describe('flux d’actualités', () => {
  it('lit les articles d’un flux Google News', () => {
    const xml = `<?xml version="1.0"?><rss><channel>
      <item><title>Élection : les résultats &amp; réactions - Le Monde</title><link>https://news.google.com/a1</link>
      <pubDate>Thu, 22 Oct 2026 18:00:00 GMT</pubDate><source url="https://lemonde.fr">Le Monde</source></item>
      <item><title><![CDATA[Météo : orages attendus]]></title><link>https://news.google.com/a2</link><pubDate>x</pubDate><source url="y">Météo-France</source></item>
    </channel></rss>`
    expect(parseNewsRss(xml)).toEqual([
      { title: 'Élection : les résultats & réactions - Le Monde', url: 'https://news.google.com/a1', date: 'Thu, 22 Oct 2026 18:00:00 GMT', source: 'Le Monde' },
      { title: 'Météo : orages attendus', url: 'https://news.google.com/a2', date: 'x', source: 'Météo-France' },
    ])
    expect(parseNewsRss('<rss></rss>')).toEqual([])
  })
})

describe('météo', () => {
  it('traduit les codes WMO', () => {
    expect(weatherLabel(0)).toBe('ciel dégagé')
    expect(weatherLabel(3)).toBe('couvert')
    expect(weatherLabel(63)).toBe('pluie')
    expect(weatherLabel(95)).toBe('orage')
  })
})
