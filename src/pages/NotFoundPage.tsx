import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-semibold">Page introuvable</h1>
      <p className="text-muted">Ce lien ne correspond à aucune mini-appli.</p>
      <Link to="/" className="min-h-11 rounded-full bg-accent px-5 py-2.5 font-medium text-accent-contrast">
        Retour à l'accueil
      </Link>
    </main>
  )
}
