import { describe, expect, it } from 'vitest'
import { localDateTimeToIso, normalizeArgs, responseText, systemInstruction, toGeminiSchema, trimContents, type GeminiContent } from './assistant'

const PARIS = 'Europe/Paris'
// Jeudi 22 octobre 2026, 21:30 à Paris
const now = new Date('2026-10-22T19:30:00Z')

describe('consignes', () => {
  it('donnent la date, l’heure et le fuseau', () => {
    const text = systemInstruction(now, PARIS)
    expect(text).toContain('jeudi 22 octobre 2026 (2026-10-22), il est 21:30, fuseau Europe/Paris')
  })
})

describe('normalisation des arguments', () => {
  it('convertit les dates-heures locales en instants (heure d’hiver comprise)', () => {
    expect(localDateTimeToIso('2026-10-27T08:00', PARIS)).toBe('2026-10-27T07:00:00.000Z')
    expect(localDateTimeToIso('pas une date', PARIS)).toBeNull()
    const args = normalizeArgs('creer_evenement', { titre: 'Dentiste', debut: '2026-10-27T08:00', fin: '2026-10-27T10:00' }, now, PARIS)
    expect(args).toMatchObject({ debut_iso: '2026-10-27T07:00:00.000Z', fin_iso: '2026-10-27T09:00:00.000Z', titre: 'Dentiste' })
  })

  it('ne convertit pas une journée entière', () => {
    expect(normalizeArgs('creer_evenement', { debut: '2026-10-27', journee_entiere: true }, now, PARIS)).not.toHaveProperty('debut_iso')
  })

  it('« alarme dans dix minutes » donne l’heure exacte', () => {
    expect(normalizeArgs('creer_alarme', { dans_minutes: 10 }, now, PARIS).heure).toBe('21:40')
    expect(normalizeArgs('creer_alarme', { dans_minutes: 45 }, new Date('2026-10-22T21:30:00Z'), PARIS).heure).toBe('00:15')
  })
})

describe('schémas et historique', () => {
  it('met les types en majuscules, récursivement', () => {
    expect(toGeminiSchema({ type: 'object', properties: { jours: { type: 'array', items: { type: 'integer' } } } })).toEqual({
      type: 'OBJECT',
      properties: { jours: { type: 'ARRAY', items: { type: 'INTEGER' } } },
    })
  })

  it('coupe l’historique au début d’une question', () => {
    const contents: GeminiContent[] = [
      { role: 'user', parts: [{ text: 'q1' }] },
      { role: 'model', parts: [{ functionCall: { name: 'lister_taches' } }] },
      { role: 'user', parts: [{ functionResponse: { name: 'lister_taches', response: {} } }] },
      { role: 'model', parts: [{ text: 'r1' }] },
      { role: 'user', parts: [{ text: 'q2' }] },
      { role: 'model', parts: [{ text: 'r2' }] },
    ]
    expect(trimContents(contents, 3)[0].parts[0].text).toBe('q2')
    expect(trimContents(contents, 10)).toHaveLength(6)
  })

  it('extrait le texte sans le raisonnement', () => {
    expect(responseText([{ text: 'réflexion', thought: true }, { text: 'Bonjour ' }, { text: '!' }])).toBe('Bonjour !')
  })
})
