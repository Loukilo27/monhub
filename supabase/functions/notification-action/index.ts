// Boutons d'action des notifications push (« Reporter 10 min », « Marquer comme fait »).
// Appelée par le service worker, qui n'a pas de session : l'autorisation repose sur le jeton
// aléatoire propre à chaque rappel (action_token), transmis uniquement dans la notification.
import { adminClient, corsHeaders, json, safeEqual } from '../_shared/admin.ts'
import { nextOccurrence, parseRRule } from '../_shared/recurrence.ts'
import { zonedToUtc } from '../_shared/zonedTime.ts'

const SNOOZE_MINUTES = 10

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Méthode non autorisée' }, 405)

  let body: { reminderId?: string; token?: string; action?: string }
  try {
    body = await request.json()
  } catch {
    return json(request, { error: 'Requête invalide' }, 400)
  }
  const { reminderId, token, action } = body
  if (!reminderId || !token || (action !== 'snooze' && action !== 'done')) {
    return json(request, { error: 'Requête invalide' }, 400)
  }

  const admin = adminClient()
  const { data: reminder } = await admin
    .from('reminders')
    .select('id, user_id, source, kind, ref_id, title, body, url, actions, action_token')
    .eq('id', reminderId)
    .maybeSingle()
  if (!reminder || !safeEqual(reminder.action_token, token)) return json(request, { error: 'Accès refusé' }, 403)

  // Dans tous les cas, la notification correspondante est considérée comme lue.
  await admin
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('reminder_id', reminder.id)
    .is('read_at', null)

  if (action === 'snooze') {
    // Durée de report propre à l'alarme, 10 minutes sinon.
    let minutes = SNOOZE_MINUTES
    if (reminder.kind === 'alarm' && reminder.ref_id) {
      const { data: alarm } = await admin.from('alarms').select('snooze_minutes').eq('id', reminder.ref_id).maybeSingle()
      minutes = alarm?.snooze_minutes ?? SNOOZE_MINUTES
    }
    await admin.from('reminders').insert({
      user_id: reminder.user_id,
      source: reminder.source,
      kind: reminder.kind,
      ref_id: reminder.ref_id,
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      actions: reminder.actions,
      snoozed: true,
      send_at: new Date(Date.now() + minutes * 60_000).toISOString(),
    })
  }

  if (action === 'done' && reminder.kind === 'task' && reminder.ref_id) await completeTask(admin, reminder.ref_id, reminder.user_id)

  return json(request, { ok: true })
})

/**
 * Coche une tâche depuis sa notification. Comme dans l'app, une tâche récurrente crée
 * l'occurrence suivante (sous-tâches remises à zéro) et son rappel.
 */
async function completeTask(admin: ReturnType<typeof adminClient>, taskId: string, userId: string) {
  const { data: task } = await admin.from('tasks').select('*').eq('id', taskId).is('completed_at', null).maybeSingle()
  if (!task) return
  await admin.from('tasks').update({ completed_at: new Date().toISOString() }).eq('id', task.id)
  // Plus de rappel pour une tâche faite (ex. un report encore en attente).
  await admin.from('reminders').delete().eq('ref_id', task.id).is('sent_at', null)

  const rule = parseRRule(task.recurrence_rule)
  if (!rule || task.parent_id) return
  const { data: settings } = await admin.from('settings').select('time_zone').eq('user_id', userId).maybeSingle()
  const timeZone = settings?.time_zone ?? 'Europe/Paris'
  const base = task.due_date ?? new Date().toISOString().slice(0, 10)
  const nextDate = nextOccurrence(rule, base, base)
  if (!nextDate) return

  const nextId = crypto.randomUUID()
  const { id: _id, created_at: _created, updated_at: _updated, ...fields } = task
  await admin.from('tasks').insert({ ...fields, id: nextId, due_date: nextDate, completed_at: null })
  const { data: subtasks } = await admin.from('tasks').select('*').eq('parent_id', task.id)
  if (subtasks?.length) {
    await admin.from('tasks').insert(
      subtasks.map(({ id: _subId, created_at: _c, updated_at: _u, ...sub }) => ({ ...sub, id: crypto.randomUUID(), parent_id: nextId, completed_at: null })),
    )
  }

  if (task.reminder_offset_minutes === null) return
  const [year, month, day] = nextDate.split('-').map(Number)
  const [hour, minute] = (task.due_time ?? '09:00').split(':').map(Number)
  const sendAt = new Date(zonedToUtc(year, month, day, hour, minute, timeZone).getTime() - task.reminder_offset_minutes * 60_000)
  if (sendAt.getTime() <= Date.now()) return
  await admin.from('reminders').insert({
    user_id: userId,
    source: 'todo',
    kind: 'task',
    ref_id: nextId,
    title: task.title,
    body: task.due_time ? `Échéance le ${day}/${month} à ${task.due_time}` : `Échéance le ${day}/${month}`,
    url: `/app/todo?task=${nextId}`,
    actions: ['done', 'snooze'],
    offset_minutes: task.reminder_offset_minutes,
    send_at: sendAt.toISOString(),
  })
}
