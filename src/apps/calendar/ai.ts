import { expandEvent } from '../../../supabase/functions/_shared/events'
import { addDays } from '../../../supabase/functions/_shared/recurrence'
import { zonedToUtc } from '../../../supabase/functions/_shared/zonedTime'
import { cachedRows, describeInstant, loadRows, localStamp, str } from '../../assistant/helpers'
import type { AiTool, ToolArgs } from '../../assistant/types'
import type { Task } from '../todo/types'
import { newEvent } from './data'
import type { CalendarEvent } from './types'

const DATE = { type: 'string', description: 'Date AAAA-MM-JJ' }
const DATETIME = { type: 'string', description: 'Date et heure locales AAAA-MM-JJTHH:MM' }

function midnight(date: string, timeZone: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return zonedToUtc(year, month, day, 0, 0, timeZone)
}

/** Début / fin d'un événement à partir des arguments (les instants _iso sont résolus par le serveur). */
function timesFrom(args: ToolArgs, timeZone: string, fallbackDurationMs = 3_600_000): { start: Date; end: Date; allDay: boolean } | null {
  if (args.journee_entiere) {
    const first = str(args.debut).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(first)) return null
    const last = str(args.fin).slice(0, 10) || first
    return { start: midnight(first, timeZone), end: midnight(addDays(last, 1), timeZone), allDay: true }
  }
  const start = str(args.debut_iso)
  if (!start) return null
  const end = str(args.fin_iso)
  return { start: new Date(start), end: end ? new Date(end) : new Date(new Date(start).getTime() + fallbackDurationMs), allDay: false }
}

async function findEvent(args: ToolArgs, ctx: Parameters<AiTool['execute']>[1]) {
  const events = await loadRows<CalendarEvent>(ctx, 'events')
  return events.find((event) => event.id === str(args.id))
}

export const calendarTools: AiTool[] = [
  {
    name: 'lister_evenements',
    description: 'Liste les rendez-vous du calendrier (récurrences comprises) et les tâches datées entre deux dates, incluses.',
    parameters: { type: 'object', properties: { date_debut: DATE, date_fin: DATE }, required: ['date_debut', 'date_fin'] },
    confirm: false,
    summarize: () => 'Consultation de l’agenda',
    execute: async (args, ctx) => {
      const from = midnight(str(args.date_debut), ctx.timeZone)
      const to = midnight(addDays(str(args.date_fin) || str(args.date_debut), 1), ctx.timeZone)
      const [events, tasks] = await Promise.all([loadRows<CalendarEvent>(ctx, 'events'), loadRows<Task>(ctx, 'tasks')])
      const occurrences = events
        .flatMap((event) => expandEvent(event, from, to, ctx.timeZone).map((occurrence) => ({ event, occurrence })))
        .sort((a, b) => a.occurrence.start.getTime() - b.occurrence.start.getTime())
      const fromDate = str(args.date_debut)
      const toDate = str(args.date_fin) || fromDate
      return {
        evenements: occurrences.map(({ event, occurrence }) => ({
          id: event.id,
          titre: event.title,
          debut: event.all_day ? occurrence.date : localStamp(occurrence.start.toISOString(), ctx.timeZone),
          fin: event.all_day ? undefined : localStamp(occurrence.end.toISOString(), ctx.timeZone),
          journee_entiere: event.all_day,
          lieu: event.location || undefined,
          recurrent: Boolean(event.recurrence_rule),
        })),
        taches_datees: tasks
          .filter((task) => !task.parent_id && task.due_date && task.due_date >= fromDate && task.due_date <= toDate)
          .map((task) => ({ id: task.id, titre: task.title, echeance: `${task.due_date}${task.due_time ? ` ${task.due_time}` : ''}`, faite: Boolean(task.completed_at) })),
      }
    },
  },
  {
    name: 'creer_evenement',
    description: 'Crée un rendez-vous dans le calendrier.',
    parameters: {
      type: 'object',
      properties: {
        titre: { type: 'string' },
        debut: DATETIME,
        fin: { ...DATETIME, description: 'Fin AAAA-MM-JJTHH:MM (par défaut : 1 h après le début)' },
        journee_entiere: { type: 'boolean', description: 'Journée entière (alors debut / fin sont des dates AAAA-MM-JJ)' },
        lieu: { type: 'string' },
        description: { type: 'string' },
        rappels_minutes: { type: 'array', items: { type: 'integer' }, description: 'Rappels, en minutes avant le début (ex. [1440, 15])' },
      },
      required: ['titre', 'debut'],
    },
    confirm: true,
    summarize: (args, ctx) => {
      const times = timesFrom(args, ctx.timeZone)
      if (!times) return `Créer le rendez-vous « ${str(args.titre)} »`
      const when = times.allDay
        ? describeInstant(times.start.toISOString(), ctx.timeZone, false)
        : `${describeInstant(times.start.toISOString(), ctx.timeZone)} → ${localStamp(times.end.toISOString(), ctx.timeZone).slice(11)}`
      return `Créer le rendez-vous « ${str(args.titre)} » le ${when}${str(args.lieu) ? ` (${str(args.lieu)})` : ''}`
    },
    execute: async (args, ctx) => {
      const times = timesFrom(args, ctx.timeZone)
      if (!times) return { erreur: 'Date de début invalide.' }
      const event = {
        ...newEvent(times.start, times.end, times.allDay),
        title: str(args.titre) || 'Rendez-vous',
        location: str(args.lieu),
        description: str(args.description),
        reminder_offsets: Array.isArray(args.rappels_minutes) ? args.rappels_minutes.filter((value): value is number => typeof value === 'number') : times.allDay ? [] : [15],
      }
      await ctx.events.saveEvent(event)
      return { ok: true, id: event.id, debut: localStamp(event.start_at, ctx.timeZone), fin: localStamp(event.end_at, ctx.timeZone) }
    },
  },
  {
    name: 'modifier_evenement',
    description: 'Modifie un rendez-vous existant (identifiant obtenu avec lister_evenements). Seuls les champs donnés changent.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' }, titre: { type: 'string' }, debut: DATETIME, fin: DATETIME, lieu: { type: 'string' }, description: { type: 'string' } },
      required: ['id'],
    },
    confirm: true,
    summarize: (args, ctx) => {
      const current = cachedRows<CalendarEvent>(ctx, 'events').find((event) => event.id === str(args.id))
      const changes = [str(args.titre) && `titre « ${str(args.titre)} »`, str(args.debut_iso) && `début ${describeInstant(str(args.debut_iso), ctx.timeZone)}`, str(args.lieu) && `lieu ${str(args.lieu)}`].filter(Boolean)
      return `Modifier le rendez-vous « ${current?.title ?? '?'} »${changes.length ? ` : ${changes.join(', ')}` : ''}`
    },
    execute: async (args, ctx) => {
      const event = await findEvent(args, ctx)
      if (!event) return { erreur: 'Rendez-vous introuvable.' }
      const duration = new Date(event.end_at).getTime() - new Date(event.start_at).getTime()
      const start = str(args.debut_iso) || event.start_at
      const end = str(args.fin_iso) || (str(args.debut_iso) ? new Date(new Date(start).getTime() + duration).toISOString() : event.end_at)
      await ctx.events.saveEvent({
        ...event,
        title: str(args.titre) || event.title,
        location: 'lieu' in args ? str(args.lieu) : event.location,
        description: 'description' in args ? str(args.description) : event.description,
        start_at: new Date(start).toISOString(),
        end_at: new Date(end).toISOString(),
      })
      return { ok: true }
    },
  },
  {
    name: 'supprimer_evenement',
    description: 'Supprime un rendez-vous (toute la série s’il est récurrent).',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    confirm: true,
    summarize: (args, ctx) => `Supprimer le rendez-vous « ${cachedRows<CalendarEvent>(ctx, 'events').find((event) => event.id === str(args.id))?.title ?? '?'} »`,
    execute: async (args, ctx) => {
      const event = await findEvent(args, ctx)
      if (!event) return { erreur: 'Rendez-vous introuvable.' }
      await ctx.events.deleteEvent(event)
      return { ok: true, titre: event.title }
    },
  },
]
