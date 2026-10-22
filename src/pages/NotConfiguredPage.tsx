/** Affiché si le build n'a pas reçu l'URL et la clé publique Supabase. */
export default function NotConfiguredPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">MonHub n’est pas configuré</h1>
      <p className="max-w-md text-muted">
        Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> sont absentes. En local,
        crée le fichier <code>.env.local</code> (voir <code>.env.example</code>) ; en ligne, ajoute-les dans les
        secrets du dépôt GitHub.
      </p>
    </main>
  )
}
