import { backend } from '../data'
import type { AppTable } from '../data/backend'
import { rowsKey } from '../data/rows'
import type { AiContext } from './types'

/** Lignes d'une table : depuis le cache si l'appli a déjà été ouverte, sinon chargées. */
export function loadRows<T extends { id: string }>(ctx: AiContext, table: AppTable): Promise<T[]> {
  return ctx.queryClient.fetchQuery({ queryKey: rowsKey(table), queryFn: () => backend.listRows<T>(table), staleTime: 10_000 })
}

/** Lignes déjà en cache (lecture synchrone, pour les récapitulatifs). */
export function cachedRows<T extends { id: string }>(ctx: AiContext, table: AppTable): T[] {
  return ctx.queryClient.getQueryData<T[]>(rowsKey(table)) ?? []
}

export const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
export const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** « mardi 27 octobre à 08:00 » dans le fuseau donné. */
export function describeInstant(iso: string, timeZone: string, withTime = true): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
    timeZone,
  })
    .format(new Date(iso))
    .replace(' ', ' ')
}

/** Date-heure locale lisible par le modèle : « 2026-10-27 08:00 ». */
export function localStamp(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeStyle: 'short', timeZone }).format(new Date(iso))
  return parts
}
