-- Phase 6 : to-do list et calendrier.

create table public.todo_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#3b82f6',
  icon text not null default 'list',
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('todo_lists');
alter publication supabase_realtime add table public.todo_lists;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#64748b',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);
select private.secure_table('tags');
alter publication supabase_realtime add table public.tags;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  list_id uuid not null references public.todo_lists (id) on delete cascade,
  parent_id uuid references public.tasks (id) on delete cascade,  -- sous-tâche
  title text not null,
  notes text not null default '',
  due_date date,                        -- date locale
  due_time text check (due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),  -- « HH:MM », facultative
  priority smallint not null default 4 check (priority between 1 and 4),  -- 1 = urgente … 4 = aucune
  tag_ids uuid[] not null default '{}',
  recurrence_rule text,                 -- RRULE (FREQ=WEEKLY;BYDAY=MO…)
  reminder_offset_minutes integer check (reminder_offset_minutes >= 0),  -- rappel X minutes avant l'échéance
  position double precision not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_list_idx on public.tasks (list_id, position);
create index tasks_due_idx on public.tasks (user_id, due_date) where completed_at is null;
select private.secure_table('tasks');
alter publication supabase_realtime add table public.tasks;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  location text not null default '',
  color text not null default '#3b82f6',
  all_day boolean not null default false,
  start_at timestamptz not null,
  end_at timestamptz not null,
  recurrence_rule text,                 -- RRULE
  exception_dates date[] not null default '{}',  -- occurrences supprimées d'une série
  reminder_offsets integer[] not null default '{}',  -- rappels X minutes avant (plusieurs possibles)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at >= start_at)
);
create index events_start_idx on public.events (user_id, start_at);
select private.secure_table('events');
alter publication supabase_realtime add table public.events;

-- Rappels relatifs à une échéance (« 15 min avant ») : décalage conservé pour reprogrammer
-- l'occurrence suivante d'une série.
alter table public.reminders add column offset_minutes integer;
