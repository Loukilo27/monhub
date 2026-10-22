-- Socle de sécurité de MonHub.
--
-- Chaque table de données suit le même modèle :
--   * une colonne user_id remplie automatiquement avec l'utilisateur connecté ;
--   * created_at / updated_at (mis à jour par trigger) ;
--   * Row Level Security activée, avec des politiques « propriétaire uniquement »
--     ET une politique restrictive qui exige une session validée par la 2FA (aal2).
-- Un mot de passe volé ne suffit donc pas à lire la moindre donnée.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Met à jour updated_at à chaque modification.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Applique le modèle de sécurité standard à une table de public :
-- RLS, politiques propriétaire, exigence 2FA, trigger updated_at.
-- À appeler dans chaque migration qui crée une table : select private.secure_table('ma_table');
create or replace function private.secure_table(table_name text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  t text := format('public.%I', table_name);
begin
  execute format('alter table %s enable row level security', t);
  execute format('revoke all on %s from anon', t);

  execute format(
    'create policy "propriétaire : lecture" on %s for select to authenticated using ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "propriétaire : ajout" on %s for insert to authenticated with check ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "propriétaire : modification" on %s for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "propriétaire : suppression" on %s for delete to authenticated using ((select auth.uid()) = user_id)', t);
  execute format(
    'create policy "2FA obligatoire" on %s as restrictive for all to authenticated using ((select auth.jwt() ->> ''aal'') = ''aal2'') with check ((select auth.jwt() ->> ''aal'') = ''aal2'')', t);

  execute format(
    'create trigger set_updated_at before update on %s for each row execute function private.set_updated_at()', t);
end;
$$;

-- Réglages : une ligne par utilisateur, synchronisée entre appareils.
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  time_zone text not null default 'Europe/Paris',
  -- Préférences diverses (fond d'écran, notifications, voix de l'IA…) ajoutées au fil des phases.
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select private.secure_table('settings');

-- Synchronisation temps réel (Realtime respecte la RLS).
alter publication supabase_realtime add table public.settings;
