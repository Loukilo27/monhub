-- Phase 9 : Musique (statistiques Last.fm, lecteur Spotify intégré).

-- Playlists Spotify favorites, enregistrées par leur lien.
create table public.music_playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  spotify_url text not null check (spotify_url ~ '^https://open\.spotify\.com/'),
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('music_playlists');
alter publication supabase_realtime add table public.music_playlists;

-- Cache des réponses Last.fm (calculs de classements, pochettes), écrit par l'Edge Function.
create table public.music_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  data jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
select private.secure_table('music_cache');

-- Nettoyage du cache expiré, chaque nuit.
select cron.schedule('monhub-purge-music-cache', '41 3 * * *', $$delete from public.music_cache where expires_at < now()$$);
