-- Phase 3 : dispositions de l'écran d'accueil et fonds d'écran.

-- Une disposition par type d'appareil (PC et mobile sont indépendants).
-- Les éléments sont stockés en JSON : [{ id, type, appId, widgetId?, page, x, y, w, h }, …]
create table public.layouts (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('desktop', 'mobile')),
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  page_count integer not null default 1 check (page_count between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

select private.secure_table('layouts');

alter publication supabase_realtime add table public.layouts;

-- Stockage de fichiers : chaque utilisateur n'accède qu'au dossier portant son identifiant
-- (<bucket>/<user_id>/…), et uniquement avec une session validée par la 2FA.
create or replace function private.secure_bucket(bucket text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  owner_check text := format(
    'bucket_id = %L and (storage.foldername(name))[1] = (select auth.uid())::text', bucket);
begin
  execute format('create policy %I on storage.objects for select to authenticated using (%s)',
    bucket || ' : lecture', owner_check);
  execute format('create policy %I on storage.objects for insert to authenticated with check (%s)',
    bucket || ' : ajout', owner_check);
  execute format('create policy %I on storage.objects for update to authenticated using (%s) with check (%s)',
    bucket || ' : modification', owner_check, owner_check);
  execute format('create policy %I on storage.objects for delete to authenticated using (%s)',
    bucket || ' : suppression', owner_check);
end;
$$;

-- 2FA obligatoire pour tous les fichiers, quel que soit le bucket.
create policy "2FA obligatoire" on storage.objects
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

-- Fonds d'écran importés : bucket privé, images de 10 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wallpapers', 'wallpapers', false, 10485760, array['image/webp', 'image/jpeg', 'image/png']);

select private.secure_bucket('wallpapers');
