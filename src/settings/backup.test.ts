import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, buildBackupZip, countRows, parentsFirst, parseBackupZip, type BackupData } from './backup'

const data: BackupData = {
  format: BACKUP_FORMAT,
  version: 1,
  exportedAt: '2026-10-23T10:00:00.000Z',
  settings: { theme: 'dark', timeZone: 'Europe/Paris', preferences: { wallpaper: { type: 'image', path: 'u/fond.png' } } },
  layouts: { desktop: { items: [], pageCount: 1 } },
  tables: {
    tasks: [
      { id: 's1', parent_id: 't1', title: 'Sous-tâche' },
      { id: 't1', parent_id: null, title: 'Tâche' },
    ],
    notes: [{ id: 'n1', title: 'Note' }],
  },
}

describe('sauvegarde', () => {
  it('aller-retour : données, fichiers des dessins et fond d’écran', () => {
    const zip = buildBackupZip(data, { 'd1-v2.json': strToU8('{"ops":[]}'), 'd1-v2.png': new Uint8Array([1, 2, 3]) }, { name: 'fond.png', bytes: new Uint8Array([9]) })
    expect(Object.keys(unzipSync(zip)).sort()).toEqual(['dessins/d1-v2.json', 'dessins/d1-v2.png', 'fond-ecran/fond.png', 'monhub.json'])

    const parsed = parseBackupZip(zip)
    expect(parsed.data).toEqual(data)
    expect(countRows(parsed.data)).toBe(3)
    expect([...parsed.drawingFiles['d1-v2.png']]).toEqual([1, 2, 3])
    expect(parsed.wallpaper?.name).toBe('fond.png')
  })

  it('refuse un fichier qui n’est pas une sauvegarde MonHub', () => {
    expect(() => parseBackupZip(strToU8('pas un zip'))).toThrow('archive ZIP valide')
    expect(() => parseBackupZip(zipSync({ 'autre.txt': strToU8('x') }))).toThrow('pas une sauvegarde MonHub')
    expect(() => parseBackupZip(zipSync({ 'monhub.json': strToU8('{"format":"autre"}') }))).toThrow('pas une sauvegarde MonHub')
    expect(() => parseBackupZip(zipSync({ 'monhub.json': strToU8(JSON.stringify({ ...data, version: 99 })) }))).toThrow('plus récente')
  })

  it('ignore les tables inconnues, les lignes sans identifiant et les chemins suspects', () => {
    const raw = { ...data, tables: { notes: [{ id: 'n1' }, { title: 'sans id' }, null], inconnue: [{ id: 'x' }] } }
    const zip = zipSync({
      'monhub.json': strToU8(JSON.stringify(raw)),
      'dessins/../../evil.png': new Uint8Array([1]),
      'dessins/sous/dossier.png': new Uint8Array([1]),
      'dessins/ok-v1.png': new Uint8Array([1]),
    })
    const parsed = parseBackupZip(zip)
    expect(parsed.data.tables).toEqual({ notes: [{ id: 'n1' }] })
    expect(Object.keys(parsed.drawingFiles)).toEqual(['ok-v1.png'])
  })

  it('restaure les tâches parentes avant leurs sous-tâches', () => {
    expect(parentsFirst(data.tables.tasks!).map((task) => task.id)).toEqual(['t1', 's1'])
  })
})
