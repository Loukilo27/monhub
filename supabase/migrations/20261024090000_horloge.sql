-- Phase 5 : mini-appli Horloge (fuseaux horaires, alarmes, minuteurs).

create table public.world_clocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  time_zone text not null,              -- identifiant IANA, ex. America/New_York
  label text not null,                  -- nom affiché, ex. « New York »
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('world_clocks');
alter publication supabase_realtime add table public.world_clocks;

create table public.alarms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  time text not null check (time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),  -- « HH:MM », heure locale
  label text not null default '',
  days smallint[] not null default '{}', -- jours ISO (1 = lundi … 7 = dimanche) ; vide = une seule fois
  sound text not null default 'carillon',
  snooze_minutes smallint not null default 10 check (snooze_minutes between 1 and 60),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('alarms');
alter publication supabase_realtime add table public.alarms;

create table public.timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default '',
  duration_seconds integer not null check (duration_seconds between 1 and 86400),
  state text not null default 'idle' check (state in ('idle', 'running', 'paused', 'finished')),
  ends_at timestamptz,                  -- en cours : heure de fin
  remaining_seconds integer,            -- en pause : temps restant
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('timers');
alter publication supabase_realtime add table public.timers;

-- Un rappel « reporté » (snooze) ne doit pas reprogrammer l'occurrence suivante d'une alarme.
alter table public.reminders add column snoozed boolean not null default false;

-- Élément concerné, pour que l'app ouverte sache quelle alarme ou quel minuteur sonne.
alter table public.notifications add column ref_id uuid;
