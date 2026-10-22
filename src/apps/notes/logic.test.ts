import { describe, expect, it } from 'vitest'
import { daysLeftInTrash, displayTitle, excerpt, matchesQuery, sortNotes, visibleNotes } from './logic'
import { EMPTY_DOC, type Note } from './types'

function note(overrides: Partial<Note>): Note {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: '',
    content: EMPTY_DOC,
    content_text: '',
    color: 'default',
    pinned: false,
    tag_ids: [],
    deleted_at: null,
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    ...overrides,
  }
}

describe('recherche', () => {
  const recette = note({ title: 'Recette des crêpes', content_text: 'Farine, œufs, lait\nLaisser reposer une heure' })

  it('cherche dans le titre et le contenu, sans accents', () => {
    expect(matchesQuery(recette, 'crepes')).toBe(true)
    expect(matchesQuery(recette, 'REPOSER')).toBe(true)
    expect(matchesQuery(recette, 'farine lait')).toBe(true)
    expect(matchesQuery(recette, 'farine sucre')).toBe(false)
    expect(matchesQuery(recette, '  ')).toBe(true)
  })
})

describe('tri et regroupement', () => {
  const a = note({ id: 'a', title: 'Banane', updated_at: '2026-10-03T00:00:00Z', created_at: '2026-10-01T00:00:00Z' })
  const b = note({ id: 'b', title: 'abricot', updated_at: '2026-10-02T00:00:00Z', created_at: '2026-10-02T00:00:00Z', pinned: true })
  const c = note({ id: 'c', title: 'Cerise', updated_at: '2026-10-04T00:00:00Z', created_at: '2026-09-01T00:00:00Z', deleted_at: '2026-10-05T00:00:00Z' })

  it('trie par modification, création ou titre', () => {
    expect(sortNotes([a, b, c], 'updated').map((n) => n.id)).toEqual(['c', 'a', 'b'])
    expect(sortNotes([a, b, c], 'created').map((n) => n.id)).toEqual(['b', 'a', 'c'])
    expect(sortNotes([a, b, c], 'title').map((n) => n.id)).toEqual(['b', 'a', 'c'])
  })

  it('met les notes épinglées à part et sépare la corbeille', () => {
    const visible = visibleNotes([a, b, c], { trash: false, query: '', tagId: null, sort: 'updated' })
    expect(visible.pinned.map((n) => n.id)).toEqual(['b'])
    expect(visible.others.map((n) => n.id)).toEqual(['a'])
    expect(visibleNotes([a, b, c], { trash: true, query: '', tagId: null, sort: 'updated' }).others.map((n) => n.id)).toEqual(['c'])
  })

  it('filtre par étiquette', () => {
    const tagged = note({ id: 't', tag_ids: ['idees'] })
    expect(visibleNotes([a, tagged], { trash: false, query: '', tagId: 'idees', sort: 'updated' }).others.map((n) => n.id)).toEqual(['t'])
  })
})

describe('affichage', () => {
  it('donne un titre même sans titre', () => {
    expect(displayTitle({ title: '  ', content_text: '\nPremière ligne\nSuite' })).toBe('Première ligne')
    expect(displayTitle({ title: '', content_text: '' })).toBe('Sans titre')
  })

  it('coupe un long extrait', () => {
    expect(excerpt('a'.repeat(200), 10)).toBe('aaaaaaaaa…')
    expect(excerpt('  un\n\ndeux  ')).toBe('un deux')
  })

  it('compte les jours restants dans la corbeille', () => {
    const now = new Date('2026-10-22T12:00:00Z')
    expect(daysLeftInTrash('2026-10-22T11:00:00Z', now)).toBe(30)
    expect(daysLeftInTrash('2026-10-01T12:00:00Z', now)).toBe(9)
    expect(daysLeftInTrash('2026-09-01T12:00:00Z', now)).toBe(0)
    expect(daysLeftInTrash('2026-10-22T12:00:30Z', now)).toBe(30) // supprimée « dans le futur » de l'horloge affichée
  })
})
