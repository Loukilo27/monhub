import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

/** Lit une variable d'environnement obligatoire. */
export function env(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`)
  return value
}

/** Client « administrateur » (ignore la RLS) : n'existe que côté serveur. */
export function adminClient(): SupabaseClient {
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
  const key = secretKeys.default ?? env('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(env('SUPABASE_URL'), key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Vérifie que la requête vient du propriétaire, connecté avec la 2FA (jeton aal2).
 * Tout autre utilisateur est refusé, même s'il existait un jour un second compte.
 */
export async function requireOwner(request: Request, admin: SupabaseClient): Promise<string | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getClaims(token)
  const claims = data?.claims
  if (error || !claims) return null
  if (claims.sub !== env('OWNER_USER_ID') || claims.aal !== 'aal2') return null
  return claims.sub
}

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] ?? ''),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  })
}

/** Comparaison en temps constant (évite de deviner un secret caractère par caractère). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index++) diff |= a.charCodeAt(index) ^ b.charCodeAt(index)
  return diff === 0
}
