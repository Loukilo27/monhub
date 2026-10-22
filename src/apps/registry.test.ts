import { describe, expect, it } from 'vitest'
import { APPS, getApp } from './registry'

describe('registre des mini-applis', () => {
  it('a des identifiants uniques et utilisables dans une URL', () => {
    const ids = APPS.map((app) => app.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/)
  })

  it('retrouve une appli par son identifiant', () => {
    expect(getApp('clock')?.name).toBe('Horloge')
    expect(getApp('inconnue')).toBeUndefined()
    expect(getApp(undefined)).toBeUndefined()
  })
})
