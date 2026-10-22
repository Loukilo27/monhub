import { describe, expect, it } from 'vitest'
import { parseChart, parseRecent, periodRange, pickImage, toArray } from './music'

const PARIS = 'Europe/Paris'
// Jeudi 22 octobre 2026, 21:30 à Paris
const now = new Date('2026-10-22T19:30:00Z')

describe('périodes calendaires', () => {
  it('mois en cours : du 1er à maintenant, un jour par barre', () => {
    const range = periodRange('month', now, PARIS)
    expect(range.from.toISOString()).toBe('2026-09-30T22:00:00.000Z') // 1er octobre 0:00 à Paris
    expect(range.to).toBe(now)
    expect(range.buckets).toHaveLength(22)
    expect(range.buckets[21].to).toBe(now)
    expect(range.label).toBe('octobre 2026')
  })

  it('mois précédent : complet', () => {
    const range = periodRange('prev-month', now, PARIS)
    expect(range.from.toISOString()).toBe('2026-08-31T22:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-09-30T22:00:00.000Z')
    expect(range.buckets).toHaveLength(30)
  })

  it('mois précédent en janvier : décembre de l’année d’avant', () => {
    const range = periodRange('prev-month', new Date('2027-01-10T10:00:00Z'), PARIS)
    expect(range.label).toBe('décembre 2026')
    expect(range.buckets).toHaveLength(31)
  })

  it('année en cours et année précédente, un mois par barre', () => {
    const year = periodRange('year', now, PARIS)
    expect(year.from.toISOString()).toBe('2025-12-31T23:00:00.000Z')
    expect(year.buckets.map((bucket) => bucket.label)).toHaveLength(10)
    const prev = periodRange('prev-year', now, PARIS)
    expect(prev.label).toBe('2025')
    expect(prev.buckets).toHaveLength(12)
    expect(prev.to.toISOString()).toBe('2025-12-31T23:00:00.000Z')
  })
})

describe('réponses Last.fm', () => {
  it('accepte un objet seul comme un tableau', () => {
    expect(toArray({ a: 1 })).toEqual([{ a: 1 }])
    expect(toArray(undefined)).toEqual([])
  })

  it('choisit la plus grande image et ignore l’étoile par défaut', () => {
    expect(
      pickImage([
        { size: 'small', '#text': 'https://x/s.png' },
        { size: 'extralarge', '#text': 'https://x/xl.png' },
      ]),
    ).toBe('https://x/xl.png')
    expect(pickImage([{ size: 'extralarge', '#text': 'https://x/2a96cbd8b46e442fc41c2b86b821562f.png' }])).toBeNull()
  })

  it('lit un classement de titres', () => {
    const json = {
      weeklytrackchart: {
        track: { name: 'Bohemian Rhapsody', playcount: '12', url: 'https://last.fm/t', artist: { '#text': 'Queen', mbid: '' }, '@attr': { rank: '1' } },
      },
    }
    expect(parseChart(json, 'track')).toEqual([{ name: 'Bohemian Rhapsody', artist: 'Queen', plays: 12, url: 'https://last.fm/t', image: null }])
  })

  it('lit l’historique récent et le titre en cours', () => {
    const json = {
      recenttracks: {
        track: [
          { name: 'En cours', artist: { '#text': 'Artiste' }, album: { '#text': 'Album' }, image: [], url: 'u', '@attr': { nowplaying: 'true' } },
          { name: 'Avant', artist: { '#text': 'Artiste' }, album: { '#text': 'Album' }, image: [], url: 'u', date: { uts: '1792700000' } },
        ],
        '@attr': { total: '1534' },
      },
    }
    const recent = parseRecent(json)
    expect(recent.total).toBe(1534)
    expect(recent.tracks[0]).toMatchObject({ nowPlaying: true, playedAt: null })
    expect(recent.tracks[1].playedAt).toBe(new Date(1792700000 * 1000).toISOString())
  })
})
