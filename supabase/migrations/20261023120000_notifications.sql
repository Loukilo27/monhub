-- Phase 4 : centre de notifications, abonnements push et rappels planifiés.

-- Historique des notifications affiché sous la cloche.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null,                 -- mini-appli d'origine (clock, todo, calendar…) ou « system »
  kind text not null default 'info',    -- alarm, timer, task, event, test, info
  title text not null,
  body text not null default '',
  url text not null default '/',        -- lien vers l'élément concerné dans l'app
  reminder_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
select private.secure_table('notifications');
alter publication supabase_realtime add table public.notifications;

-- Un abonnement Web Push par appareil (navigateur).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text not null default 'Appareil',
  last_seen_at timestamptz not null default now(),
  last_success_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('push_subscriptions');

-- Rappels à envoyer à une date précise (alarmes, minuteurs, tâches, événements).
-- Les mini-applis y ajoutent des lignes ; l'Edge Function « dispatch-reminders » les envoie.
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source text not null,
  kind text not null check (kind in ('alarm', 'timer', 'task', 'event', 'test', 'info')),
  ref_id uuid,                          -- élément concerné (alarme, tâche, événement…)
  title text not null,
  body text not null default '',
  url text not null default '/',
  actions text[] not null default '{}', -- boutons de la notification : snooze, done
  send_at timestamptz not null,
  sent_at timestamptz,
  -- Jeton à usage unique permettant au service worker d'exécuter une action
  -- (« Reporter », « Marquer comme fait ») sans session, pour ce seul rappel.
  action_token text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_due_idx on public.reminders (send_at) where sent_at is null;
create index reminders_ref_idx on public.reminders (ref_id) where sent_at is null;
select private.secure_table('reminders');

-- Envoi chaque minute : pg_cron vérifie s'il y a des rappels échus et, seulement dans ce cas,
-- appelle l'Edge Function (économise les appels de l'offre gratuite).
-- L'URL du projet et le secret partagé sont lus dans Supabase Vault (jamais dans le dépôt).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create or replace function private.trigger_reminder_dispatch()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_url text;
  cron_secret text;
begin
  if not exists (select 1 from public.reminders where sent_at is null and send_at <= now()) then
    return;
  end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'cron_secret';
  if project_url is null or cron_secret is null then
    raise warning 'MonHub : secrets project_url / cron_secret absents du Vault';
    return;
  end if;
  perform net.http_post(
    url := project_url || '/functions/v1/dispatch-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', cron_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
end;
$$;

revoke all on function private.trigger_reminder_dispatch() from public, anon, authenticated;

select cron.schedule('monhub-dispatch-reminders', '* * * * *', 'select private.trigger_reminder_dispatch()');
