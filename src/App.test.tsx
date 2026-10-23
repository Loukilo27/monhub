import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { localBackend } from './data/localBackend'
import { queryClient } from './data/queryClient'
import { createFakeSupabase, type FakeSupabaseOptions } from './test/fakeSupabase'

const fake = vi.hoisted(() => ({ client: null as unknown }))

vi.mock('./lib/supabase', () => ({
  isSupabaseConfigured: true,
  get supabase() {
    return fake.client
  },
  requireSupabase: () => fake.client,
}))

// Données en mémoire du navigateur à la place de Supabase.
vi.mock('./data', async () => {
  const { localBackend } = await import('./data/localBackend')
  const { Outbox } = await import('./data/outbox')
  return { isDemoMode: false, backend: localBackend, outbox: new Outbox(localBackend) }
})

function setScreen(width: number, height: number) {
  Object.defineProperty(window.screen, 'width', { value: width, configurable: true })
  Object.defineProperty(window.screen, 'height', { value: height, configurable: true })
}

function renderApp(options?: FakeSupabaseOptions) {
  fake.client = createFakeSupabase(options)
  return render(<App />)
}

beforeEach(() => {
  queryClient.clear()
  window.location.hash = ''
  document.documentElement.classList.remove('dark')
  setScreen(390, 844)
})

describe('App connectée (mot de passe + 2FA)', () => {
  it('affiche l’accueil vide avec la barre d’état', async () => {
    renderApp()
    expect(await screen.findByText('Ton écran d’accueil est vide.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Réglages' })).toBeInTheDocument()
  })

  it('change de thème en un clic et l’enregistre', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: /Thème : Automatique/ }))
    expect(document.documentElement).not.toHaveClass('dark')
    await userEvent.click(screen.getByRole('button', { name: /Thème : Clair/ }))
    expect(document.documentElement).toHaveClass('dark')
    await waitFor(async () => expect((await localBackend.loadSettings())?.theme).toBe('dark'))
  })

  it('ouvre une mini-appli depuis son URL et revient à l’accueil avec Échap', async () => {
    window.location.hash = '#/app/clock'
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Horloge' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByText('Ton écran d’accueil est vide.')).toBeInTheDocument()
  })

  it('affiche une page introuvable pour une appli inconnue', async () => {
    window.location.hash = '#/app/nexiste-pas'
    renderApp()
    expect(await screen.findByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })
})

describe('Accueil personnalisable', () => {
  it('ajoute un raccourci et un widget depuis le tiroir, puis les enregistre', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter des applis' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter le raccourci Notes' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Ajouter le widget Horloge en 2×2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Terminé' }))

    expect(await screen.findByRole('link', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /Widget Horloge/ })).toBeInTheDocument()
    const saved = await localBackend.loadLayout('mobile')
    expect(saved?.items.map(({ type, appId, x, y, w, h }) => ({ type, appId, x, y, w, h }))).toEqual([
      { type: 'shortcut', appId: 'notes', x: 0, y: 0, w: 1, h: 1 },
      { type: 'widget', appId: 'clock', x: 1, y: 0, w: 2, h: 2 },
    ])
  })

  it('garde des dispositions PC et mobile séparées', async () => {
    await localBackend.saveLayout('desktop', {
      items: [{ id: 'd1', type: 'shortcut', appId: 'paint', page: 0, x: 9, y: 5, w: 1, h: 1 }],
      pageCount: 1,
    })
    setScreen(1920, 1080)
    renderApp()
    expect(await screen.findByRole('link', { name: 'Mini Paint' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
    expect(await localBackend.loadLayout('mobile')).toBeNull()
  })

  it('retire un élément en mode édition', async () => {
    await localBackend.saveLayout('mobile', {
      items: [{ id: 'm1', type: 'shortcut', appId: 'todo', page: 0, x: 0, y: 0, w: 1, h: 1 }],
      pageCount: 1,
    })
    renderApp()
    const grid = await screen.findByRole('link', { name: 'Tâches' })
    grid.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await userEvent.click(await screen.findByRole('button', { name: 'Retirer Tâches de l’accueil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Terminé' }))
    await waitFor(async () => expect((await localBackend.loadLayout('mobile'))?.items).toEqual([]))
    expect(within(document.body).queryByRole('link', { name: 'Tâches' })).not.toBeInTheDocument()
  })
})

describe('Notifications', () => {
  it('affiche une notification reçue sous la cloche, puis la marque comme lue', async () => {
    renderApp()
    await screen.findByRole('button', { name: 'Notifications' })
    await localBackend.createReminder({
      source: 'todo',
      kind: 'task',
      title: 'Appeler le garage',
      body: 'Avant midi',
      url: '/app/todo',
      sendAt: new Date(),
    })
    const bell = await screen.findByRole('button', { name: 'Notifications : 1 non lue' })
    // Toast affiché pendant que l'app est ouverte.
    expect(await screen.findByText('Appeler le garage — Avant midi')).toBeInTheDocument()

    await userEvent.click(bell)
    const panel = await screen.findByRole('dialog', { name: 'Notifications' })
    expect(within(panel).getByText('Appeler le garage')).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole('button', { name: 'Tout marquer comme lu' }))
    await waitFor(async () => expect((await localBackend.listNotifications())[0].readAt).not.toBeNull())
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('ne montre pas de toast pour une mini-appli coupée', async () => {
    await localBackend.saveSettings({ preferences: { notifications: { disabledApps: ['calendar'] } } })
    renderApp()
    await screen.findByRole('button', { name: 'Notifications' })
    await localBackend.createReminder({ source: 'calendar', kind: 'event', title: 'Dentiste', sendAt: new Date() })
    await screen.findByRole('button', { name: 'Notifications : 1 non lue' })
    expect(screen.queryByText('Dentiste')).not.toBeInTheDocument()
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
    expect(screen.queryByText('Ton écran d’accueil est vide.')).not.toBeInTheDocument()
  })

  it('impose la configuration de la 2FA si elle n’existe pas encore', async () => {
    renderApp({ currentLevel: 'aal1', nextLevel: 'aal1' })
    expect(await screen.findByRole('heading', { name: 'Active la double authentification' })).toBeInTheDocument()
    expect(await screen.findByText('SECRET')).toBeInTheDocument()
  })
})
