import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createFakeSupabase, type FakeSupabaseOptions } from './test/fakeSupabase'

const fake = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return fake.client
  },
  requireSupabase: () => fake.client,
}))

function renderApp(options?: FakeSupabaseOptions) {
  fake.client = createFakeSupabase(options)
  return render(<App />)
}

describe('App connectée (mot de passe + 2FA)', () => {
  beforeEach(() => {
    window.location.hash = ''
    document.documentElement.classList.remove('dark')
  })

  it('affiche l’accueil vide avec la barre d’état', async () => {
    renderApp()
    expect(await screen.findByText("Votre écran d'accueil est vide.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Réglages' })).toBeInTheDocument()
  })

  it('change de thème en un clic', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: /Thème : Automatique/ }))
    expect(document.documentElement).not.toHaveClass('dark')
    await userEvent.click(screen.getByRole('button', { name: /Thème : Clair/ }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('ouvre une mini-appli depuis son URL et revient à l’accueil avec Échap', async () => {
    window.location.hash = '#/app/clock'
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Horloge' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByText("Votre écran d'accueil est vide.")).toBeInTheDocument()
  })

  it('affiche une page introuvable pour une appli inconnue', async () => {
    window.location.hash = '#/app/nexiste-pas'
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })
})

describe('Accès protégé', () => {
  it('demande de se connecter sans session, sans proposer d’inscription', async () => {
    renderApp({ signedIn: false })
    expect(await screen.findByRole('button', { name: 'Se connecter' })).toBeInTheDocument()
    expect(screen.queryByText(/inscri/i)).not.toBeInTheDocument()
  })

  it('traduit une erreur d’identifiants', async () => {
    renderApp({ signedIn: false })
    await userEvent.type(await screen.findByLabelText('E-mail'), 'moi@example.com')
    await userEvent.type(screen.getByLabelText('Mot de passe'), 'mauvais')
    await userEvent.click(screen.getByRole('button', { name: 'Se connecter' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou mot de passe incorrect.')
  })

  it('demande le code 2FA quand la session n’est validée que par mot de passe', async () => {
    renderApp({ currentLevel: 'aal1', nextLevel: 'aal2' })
    expect(await screen.findByRole('heading', { name: 'Vérification en deux étapes' })).toBeInTheDocument()
    expect(screen.queryByText("Votre écran d'accueil est vide.")).not.toBeInTheDocument()
  })

  it('impose la configuration de la 2FA si elle n’existe pas encore', async () => {
    renderApp({ currentLevel: 'aal1', nextLevel: 'aal1' })
    expect(await screen.findByRole('heading', { name: 'Active la double authentification' })).toBeInTheDocument()
    expect(await screen.findByText('SECRET')).toBeInTheDocument()
  })
})
