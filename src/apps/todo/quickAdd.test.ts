import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'

// Jeudi 22 octobre 2026
const TODAY = '2026-10-22'

describe('parseQuickAdd', () => {
  it('garde le titre seul quand il n’y a rien à reconnaître', () => {
    expect(parseQuickAdd('Acheter du pain', TODAY)).toEqual({ title: 'Acheter du pain', dueDate: null, dueTime: null, priority: null, tags: [] })
  })

  it('reconnaît date, heure, étiquettes et priorité', () => {
    expect(parseQuickAdd('Appeler le garage demain 14h #voiture !1', TODAY)).toEqual({
      title: 'Appeler le garage',
      dueDate: '2026-10-23',
      dueTime: '14:00',
      priority: 1,
      tags: ['voiture'],
    })
  })

  it('comprend les jours de la semaine (toujours dans le futur)', () => {
    expect(parseQuickAdd('Sport lundi', TODAY).dueDate).toBe('2026-10-26')
    expect(parseQuickAdd('Réunion jeudi à 9h30', TODAY)).toMatchObject({ title: 'Réunion', dueDate: '2026-10-29', dueTime: '09:30' })
    expect(parseQuickAdd('Courses samedi prochain', TODAY)).toMatchObject({ title: 'Courses', dueDate: '2026-10-24' })
  })

  it('comprend les dates relatives et numériques', () => {
    expect(parseQuickAdd('Rendre le livre après-demain', TODAY).dueDate).toBe('2026-10-24')
    expect(parseQuickAdd('Vaccin dans 2 semaines', TODAY).dueDate).toBe('2026-11-05')
    expect(parseQuickAdd('Loyer le 1er', TODAY).dueDate).toBe('2026-11-01')
    expect(parseQuickAdd('Anniversaire 12/11', TODAY).dueDate).toBe('2026-11-12')
    expect(parseQuickAdd('Impôts 15/05', TODAY).dueDate).toBe('2027-05-15')
    expect(parseQuickAdd('Dossier 03/01/2028', TODAY).dueDate).toBe('2028-01-03')
  })

  it('une heure seule vise aujourd’hui ; « ce soir » et « midi »', () => {
    expect(parseQuickAdd('Appeler maman 18h', TODAY)).toMatchObject({ dueDate: TODAY, dueTime: '18:00' })
    expect(parseQuickAdd('Film ce soir', TODAY)).toMatchObject({ title: 'Film', dueDate: TODAY, dueTime: '19:00' })
    expect(parseQuickAdd('Déjeuner demain midi', TODAY)).toMatchObject({ title: 'Déjeuner', dueTime: '12:00' })
  })

  it('ne confond pas un nombre avec une heure invalide', () => {
    expect(parseQuickAdd('Lire 30h de cours', TODAY)).toMatchObject({ title: 'Lire 30h de cours', dueTime: null })
  })
})
