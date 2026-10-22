import { nextAlarmOccurrence } from '../../../supabase/functions/_shared/zonedTime'
import { describeInstant, num, str } from '../../assistant/helpers'
import type { AiTool } from '../../assistant/types'
import { describeDays, newAlarm } from './alarms'
import { setStopwatch, startStopwatch, INITIAL_STOPWATCH } from './stopwatch'
import { describeDuration } from './timers'

function durationSeconds(args: Record<string, unknown>): number {
  return Math.round((num(args.heures) ?? 0) * 3600 + (num(args.minutes) ?? 0) * 60 + (num(args.secondes) ?? 0))
}

export const clockTools: AiTool[] = [
  {
    name: 'creer_alarme',
    description: 'Crée une alarme : à une heure donnée (HH:MM), ou « dans N minutes » (dans_minutes). Jours de répétition facultatifs.',
    parameters: {
      type: 'object',
      properties: {
        heure: { type: 'string', description: 'Heure HH:MM' },
        dans_minutes: { type: 'integer', description: 'Sonner dans N minutes (au lieu de heure)' },
        nom: { type: 'string' },
        jours: { type: 'array', items: { type: 'integer' }, description: 'Jours ISO 1 = lundi … 7 = dimanche ; vide = une seule fois' },
      },
    },
    confirm: true,
    summarize: (args) => {
      const days = Array.isArray(args.jours) ? args.jours.filter((day): day is number => typeof day === 'number') : []
      return `Créer une alarme à ${str(args.heure) || '?'}${str(args.nom) ? ` « ${str(args.nom)} »` : ''} (${describeDays(days).toLowerCase()})`
    },
    execute: async (args, ctx) => {
      const time = str(args.heure)
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { erreur: 'Heure invalide.' }
      const days = Array.isArray(args.jours) ? args.jours.filter((day): day is number => typeof day === 'number' && day >= 1 && day <= 7) : []
      const alarm = { ...newAlarm(), time, label: str(args.nom), days }
      await ctx.alarms.saveAlarm(alarm)
      const next = nextAlarmOccurrence(alarm, new Date(), ctx.timeZone)
      return { ok: true, heure: time, prochaine_sonnerie: describeInstant(next.toISOString(), ctx.timeZone) }
    },
  },
  {
    name: 'lancer_minuteur',
    description: 'Lance un minuteur (compte à rebours).',
    parameters: {
      type: 'object',
      properties: { heures: { type: 'integer' }, minutes: { type: 'integer' }, secondes: { type: 'integer' }, nom: { type: 'string' } },
    },
    confirm: false,
    summarize: (args) => `Minuteur lancé : ${describeDuration(durationSeconds(args))}${str(args.nom) ? ` (${str(args.nom)})` : ''}`,
    execute: async (args, ctx) => {
      const seconds = durationSeconds(args)
      if (seconds <= 0 || seconds > 86_400) return { erreur: 'Durée invalide (1 s à 24 h).' }
      await ctx.timers.create(seconds, str(args.nom))
      return { ok: true, duree: describeDuration(seconds) }
    },
  },
  {
    name: 'lancer_chronometre',
    description: 'Démarre le chronomètre (remis à zéro) et l’affiche.',
    parameters: { type: 'object', properties: {} },
    confirm: false,
    summarize: () => 'Chronomètre démarré',
    execute: async (_args, ctx) => {
      setStopwatch(startStopwatch(INITIAL_STOPWATCH, Date.now()))
      ctx.navigate('/app/clock?tab=chrono')
      return { ok: true }
    },
  },
]
