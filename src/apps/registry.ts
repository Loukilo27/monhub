import { calendarApp } from './calendar'
import { clockApp } from './clock'
import { musicApp } from './music'
import { notesApp } from './notes'
import { paintApp } from './paint'
import { todoApp } from './todo'
import type { MiniApp } from './types'

/**
 * Registre central des mini-applis. Pour en ajouter une : créer son dossier
 * dans src/apps/<id>/ avec un index.ts qui exporte sa définition, puis l'ajouter ici.
 */
export const APPS: MiniApp[] = [clockApp, todoApp, calendarApp, notesApp, musicApp, paintApp]

const byId = new Map(APPS.map((app) => [app.id, app]))

export function getApp(id: string | undefined): MiniApp | undefined {
  return id ? byId.get(id) : undefined
}
