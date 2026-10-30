-- Météo : villes enregistrées (prévisions Open-Meteo, gratuites et sans clé, lues par l'app).
create table public.weather_cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  admin1 text not null default '',
  country text not null default '',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timezone text not null default 'auto',
  position double precision not null default 0,
  -- Ville affichée par défaut (widget, ouverture de l'appli).
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
select private.secure_table('weather_cities');
alter publication supabase_realtime add table public.weather_cities;
