-- Phase 8 : Mini Paint.

-- Un dessin = une ligne ici + des fichiers dans le bucket privé « drawings » :
--   <user_id>/<id>-v<version>.json  (document vectoriel : historique des tracés, pour reprendre l'édition)
--   <user_id>/<id>-v<version>.png   (image complète, export)
--   <user_id>/<id>-v<version>.webp  (miniature de la galerie)
-- La version change à chaque enregistrement : aucun cache ne sert une ancienne image.
create table public.drawings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  width integer not null check (width between 100 and 4096),
  height integer not null check (height between 100 and 4096),
  background text not null default '#ffffff',
  version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drawings_user_updated_idx on public.drawings (user_id, updated_at desc);
select private.secure_table('drawings');
alter publication supabase_realtime add table public.drawings;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('drawings', 'drawings', false, 20971520, array['application/json', 'image/png', 'image/webp']);

select private.secure_bucket('drawings');
