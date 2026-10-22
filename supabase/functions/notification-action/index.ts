// Boutons d'action des notifications push (« Reporter 10 min », « Marquer comme fait »).
// Appelée par le service worker, qui n'a pas de session : l'autorisation repose sur le jeton
// aléatoire propre à chaque rappel (action_token), transmis uniquement dans la notification.
import { adminClient, corsHeaders, json, safeEqual } from '../_shared/admin.ts'

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

  if (action === 'done' && reminder.kind === 'task' && reminder.ref_id) {
    // Coche la tâche liée (table créée à la phase To-do ; sans effet tant qu'elle n'existe pas).
    await admin.from('tasks').update({ completed_at: new Date().toISOString() }).eq('id', reminder.ref_id)
  }

  return json(request, { ok: true })
})
