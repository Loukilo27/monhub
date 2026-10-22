-- Phase 7 : mini-appli Notes.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  content jsonb not null default '{"type": "doc", "content": []}'::jsonb,  -- document TipTap
  content_text text not null default '',  -- texte brut (recherche, aperçus)
  color text not null default 'default',  -- couleur de fond (clé de palette)
  pinned boolean not null default false,
  tag_ids uuid[] not null default '{}',   -- étiquettes partagées avec la to-do (table tags)
  deleted_at timestamptz,                 -- dans la corbeille depuis
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_updated_idx on public.notes (user_id, updated_at desc);
select private.secure_table('notes');
alter publication supabase_realtime add table public.notes;

-- Corbeille : suppression définitive après 30 jours (chaque nuit à 3 h 17 UTC).
select cron.schedule(
  'monhub-purge-notes-trash',
  '17 3 * * *',
  $$delete from public.notes where deleted_at < now() - interval '30 days'$$
);
