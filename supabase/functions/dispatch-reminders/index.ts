// Envoie les rappels échus : appelée chaque minute par pg_cron (en-tête x-cron-secret),
// ou par l'app elle-même (jeton du propriétaire) pour un envoi immédiat, ex. notification de test.
import webpush from 'npm:web-push@3.6.7'
import { adminClient, corsHeaders, env, json, requireOwner, safeEqual } from '../_shared/admin.ts'
import { ACTION_LABELS, shouldPush, type NotificationPreferences } from '../_shared/notificationRules.ts'

interface Reminder {
  id: string
  user_id: string
  source: string
  kind: string
  title: string
  body: string
  url: string
  actions: string[]
  send_at: string
  action_token: string
}

interface Subscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(request) })
  if (request.method !== 'POST') return json(request, { error: 'Méthode non autorisée' }, 405)

  const admin = adminClient()
  const cronSecret = request.headers.get('x-cron-secret')
  const fromCron = cronSecret !== null && safeEqual(cronSecret, env('CRON_SECRET'))
  if (!fromCron && !(await requireOwner(request, admin))) return json(request, { error: 'Accès refusé' }, 401)

  const ownerId = env('OWNER_USER_ID')
  const now = new Date()

  // Réservation atomique : un rappel ne peut être pris que par une seule exécution.
  const { data: due, error } = await admin
    .from('reminders')
    .update({ sent_at: now.toISOString() })
    .eq('user_id', ownerId)
    .is('sent_at', null)
    .lte('send_at', now.toISOString())
    .select('id, user_id, source, kind, title, body, url, actions, send_at, action_token')
  if (error) return json(request, { error: error.message }, 500)
  if (!due?.length) return json(request, { sent: 0 })

  const [{ data: settings }, { data: subscriptions }] = await Promise.all([
    admin.from('settings').select('time_zone, preferences').eq('user_id', ownerId).maybeSingle(),
    admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', ownerId),
  ])
  const timeZone = settings?.time_zone ?? 'Europe/Paris'
  const prefs = (settings?.preferences?.notifications ?? {}) as NotificationPreferences

  let pushes = 0
  const expired = new Set<string>()
  const delivered = new Set<string>()

  for (const reminder of due as Reminder[]) {
    // Toujours dans l'historique (cloche), même quand le push est coupé.
    const { data: notification } = await admin
      .from('notifications')
      .insert({
        user_id: ownerId,
        source: reminder.source,
        kind: reminder.kind,
        title: reminder.title,
        body: reminder.body,
        url: reminder.url,
        reminder_id: reminder.id,
      })
      .select('id')
      .single()

    if (!shouldPush(reminder, prefs, now, timeZone)) continue

    const urgent = reminder.kind === 'alarm' || reminder.kind === 'timer'
    const payload = JSON.stringify({
      title: reminder.title,
      body: reminder.body,
      url: reminder.url,
      kind: reminder.kind,
      tag: reminder.id,
      notificationId: notification?.id,
      reminderId: reminder.id,
      token: reminder.action_token,
      actionUrl: `${env('SUPABASE_URL')}/functions/v1/notification-action`,
      actions: reminder.actions.filter((action) => ACTION_LABELS[action]).map((action) => ({ action, title: ACTION_LABELS[action] })),
      requireInteraction: urgent,
    })

    await Promise.all(
      ((subscriptions ?? []) as Subscription[]).map(async (subscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            payload,
            { TTL: urgent ? 300 : 3600, urgency: urgent ? 'high' : 'normal' },
          )
          pushes++
          delivered.add(subscription.id)
        } catch (pushError) {
          const status = (pushError as { statusCode?: number }).statusCode
          // 404 / 410 : abonnement révoqué (navigateur réinstallé, autorisation retirée…).
          if (status === 404 || status === 410) expired.add(subscription.id)
          else console.error('Échec du push', status, (pushError as Error).message)
        }
      }),
    )
  }

  if (expired.size) await admin.from('push_subscriptions').delete().in('id', [...expired])
  if (delivered.size) {
    await admin.from('push_subscriptions').update({ last_success_at: now.toISOString() }).in('id', [...delivered])
  }

  return json(request, { sent: due.length, pushes, expired: expired.size })
})
