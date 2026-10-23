import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Backend } from './backend'
import { compact, isNetworkError, Outbox, withOutbox } from './outbox'

let online = true
Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online })

/** Accès aux données factice : enregistre les appels, échoue à la demande. */
function fakeBackend() {
  const calls: string[] = []
  const inner = {
    upsertRows: vi.fn(async (table: string, rows: { id: string }[], editedAt?: string) => {
      calls.push(`upsert ${table} ${rows.map((row) => JSON.stringify(row)).join(' ')} @${editedAt}`)
    }),
    deleteRows: vi.fn(async (table: string, ids: string[]) => {
      calls.push(`delete ${table} ${ids.join(',')}`)
    }),
    createReminder: vi.fn(async (reminder: { title: string; sendAt: Date }) => {
      calls.push(`reminder ${reminder.title} ${reminder.sendAt.toISOString()}`)
    }),
    cancelReminders: vi.fn(async (refId: string) => {
      calls.push(`cancel ${refId}`)
    }),
    listRows: vi.fn(async () => {
      calls.push('list')
      return []
    }),
  } as unknown as Backend
  return { inner, calls }
}

beforeEach(() => {
  online = true
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T10:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isNetworkError', () => {
  it('reconnaît les erreurs réseau des navigateurs', () => {
    expect(isNetworkError(new Error('TypeError: Failed to fetch'))).toBe(true)
    expect(isNetworkError(new Error('NetworkError when attempting to fetch resource.'))).toBe(true)
    expect(isNetworkError(new Error('Load failed'))).toBe(true)
    expect(isNetworkError(new Error('new row violates row-level security policy'))).toBe(false)
  })

  it('considère toute erreur comme réseau quand le navigateur est hors-ligne', () => {
    online = false
    expect(isNetworkError(new Error('autre chose'))).toBe(true)
  })
})

describe('Outbox', () => {
  it('en ligne : écrit directement, avec l’heure de la modification', async () => {
    const { inner, calls } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    await withOutbox(inner, outbox).upsertRows('tasks', [{ id: 't1' }])
    expect(calls).toEqual(['upsert tasks {"id":"t1"} @2026-10-23T10:00:00.000Z'])
    expect(outbox.size).toBe(0)
  })

  it('hors-ligne : met en file, garde l’heure de chaque modification et envoie dans l’ordre au retour du réseau', async () => {
    const { inner, calls } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    const backend = withOutbox(inner, outbox)
    const flushed = vi.fn()
    outbox.onFlushed(flushed)

    online = false
    await backend.upsertRows('tasks', [{ id: 't1' }])
    await backend.cancelReminders('t1')
    await backend.createReminder({ source: 'todo', kind: 'task', title: 'Rappel', sendAt: new Date('2026-10-24T08:00:00Z') })
    await backend.deleteRows('notes', ['n1'])
    expect(calls).toEqual([])
    expect(outbox.size).toBe(4)
    // Conservée dans le navigateur : survit à un rechargement de la page.
    expect(JSON.parse(localStorage.getItem('monhub.outbox')!)).toHaveLength(4)
    expect(new Outbox(inner, localStorage).size).toBe(4)

    vi.setSystemTime(new Date('2026-10-23T11:00:00Z'))
    online = true
    await outbox.flush()
    expect(calls).toEqual([
      'upsert tasks {"id":"t1"} @2026-10-23T10:00:00.000Z',
      'cancel t1',
      'reminder Rappel 2026-10-24T08:00:00.000Z',
      'delete notes n1',
    ])
    expect(outbox.size).toBe(0)
    expect(localStorage.getItem('monhub.outbox')).toBeNull()
    expect(flushed).toHaveBeenCalledWith({ sent: 4, failed: 0 })
  })

  it('en ligne mais serveur injoignable : met en file au lieu d’échouer', async () => {
    const { inner } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    vi.mocked(inner.upsertRows).mockRejectedValueOnce(new Error('TypeError: Failed to fetch'))
    await expect(withOutbox(inner, outbox).upsertRows('notes', [{ id: 'n1' }])).resolves.toBeUndefined()
    expect(outbox.size).toBe(1)
  })

  it('une erreur du serveur (hors réseau) remonte à l’appelant', async () => {
    const { inner } = fakeBackend()
    vi.mocked(inner.upsertRows).mockRejectedValueOnce(new Error('violates check constraint'))
    await expect(withOutbox(inner, new Outbox(inner, localStorage)).upsertRows('notes', [{ id: 'n1' }])).rejects.toThrow('violates check constraint')
  })

  it('les écritures suivantes passent derrière la file, même en ligne', async () => {
    const { inner, calls } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    const backend = withOutbox(inner, outbox)
    online = false
    await backend.deleteRows('tasks', ['a'])
    online = true
    await backend.deleteRows('tasks', ['b'])
    expect(calls).toEqual([])
    await outbox.flush()
    expect(calls).toEqual(['delete tasks a', 'delete tasks b'])
  })

  it('une modification refusée par le serveur est abandonnée et signalée, la suite part quand même', async () => {
    const { inner, calls } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    const backend = withOutbox(inner, outbox)
    const flushed = vi.fn()
    outbox.onFlushed(flushed)
    online = false
    await backend.deleteRows('tasks', ['a'])
    await backend.deleteRows('notes', ['b'])
    online = true
    vi.mocked(inner.deleteRows).mockRejectedValueOnce(new Error('violates foreign key constraint'))
    await outbox.flush()
    expect(calls).toEqual(['delete notes b'])
    expect(flushed).toHaveBeenCalledWith({ sent: 1, failed: 1 })
  })

  it('le réseau qui retombe pendant l’envoi garde le reste de la file', async () => {
    const { inner, calls } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    const backend = withOutbox(inner, outbox)
    online = false
    await backend.deleteRows('tasks', ['a'])
    await backend.deleteRows('tasks', ['b'])
    online = true
    vi.mocked(inner.deleteRows).mockImplementationOnce(async () => {
      calls.push('delete tasks a')
      online = false
    })
    await outbox.flush()
    expect(calls).toEqual(['delete tasks a'])
    expect(outbox.size).toBe(1)
  })

  it('les lectures attendent l’envoi de la file (l’écran ne revient pas en arrière)', async () => {
    const { inner, calls } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    const backend = withOutbox(inner, outbox)
    online = false
    await backend.deleteRows('tasks', ['a'])
    online = true
    await backend.listRows('tasks')
    expect(calls).toEqual(['delete tasks a', 'list'])
  })

  it('vide la file à la déconnexion', async () => {
    const { inner } = fakeBackend()
    const outbox = new Outbox(inner, localStorage)
    online = false
    await withOutbox(inner, outbox).deleteRows('tasks', ['a'])
    outbox.clear()
    expect(outbox.size).toBe(0)
    expect(localStorage.getItem('monhub.outbox')).toBeNull()
  })
})

describe('compact', () => {
  it('fusionne les modifications successives d’une même ligne', () => {
    const merged = compact(
      { type: 'upsertRows', table: 'notes', rows: [{ id: 'n1', title: 'A', body: 'x' } as { id: string }], editedAt: '1' },
      { type: 'upsertRows', table: 'notes', rows: [{ id: 'n1', body: 'y' } as { id: string }], editedAt: '2' },
    )
    expect(merged).toEqual({ type: 'upsertRows', table: 'notes', rows: [{ id: 'n1', title: 'A', body: 'y' }], editedAt: '2' })
  })

  it('ne fusionne pas des lignes ou des tables différentes', () => {
    expect(compact({ type: 'upsertRows', table: 'notes', rows: [{ id: 'n1' }], editedAt: '1' }, { type: 'upsertRows', table: 'notes', rows: [{ id: 'n2' }], editedAt: '2' })).toBeNull()
    expect(compact({ type: 'upsertRows', table: 'notes', rows: [{ id: 'n1' }], editedAt: '1' }, { type: 'upsertRows', table: 'tasks', rows: [{ id: 'n1' }], editedAt: '2' })).toBeNull()
    expect(compact(undefined, { type: 'deleteRows', table: 'notes', ids: ['n1'] })).toBeNull()
  })

  it('garde la dernière disposition et cumule les réglages', () => {
    const layout = { items: [], pageCount: 2 }
    expect(compact({ type: 'saveLayout', kind: 'mobile', layout: { items: [], pageCount: 1 }, editedAt: '1' }, { type: 'saveLayout', kind: 'mobile', layout, editedAt: '2' })).toEqual({
      type: 'saveLayout',
      kind: 'mobile',
      layout,
      editedAt: '2',
    })
    expect(compact({ type: 'saveSettings', patch: { theme: 'dark' }, editedAt: '1' }, { type: 'saveSettings', patch: { timeZone: 'Asia/Tokyo' }, editedAt: '2' })).toEqual({
      type: 'saveSettings',
      patch: { theme: 'dark', timeZone: 'Asia/Tokyo' },
      editedAt: '2',
    })
  })
})
