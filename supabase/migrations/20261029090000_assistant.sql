-- Phase 10 : assistant IA (Gemini).

-- Une conversation : titre + historique brut envoyé à Gemini (tours, appels d'outils,
-- signatures de raisonnement), lu et écrit uniquement par l'Edge Function « assistant ».
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Nouvelle conversation',
  contents jsonb not null default '[]'::jsonb,
  -- Résultats d'outils exécutés côté serveur en attente des résultats de l'app.
  pending_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_updated_idx on public.ai_conversations (user_id, updated_at desc);
select private.secure_table('ai_conversations');

-- Messages affichés dans le panneau (questions, réponses, actions effectuées).
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'action')),
  text text not null,
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);
select private.secure_table('ai_messages');
