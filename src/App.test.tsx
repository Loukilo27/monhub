import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    window.location.hash = ''
    document.documentElement.classList.remove('dark')
  })

  it('affiche l’accueil vide avec la barre d’état', () => {
    render(<App />)
    expect(screen.getByText("Votre écran d'accueil est vide.")).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Réglages' })).toBeInTheDocument()
  })

  it('change de thème en un clic', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /Thème : Automatique/ }))
    expect(document.documentElement).not.toHaveClass('dark')
    await userEvent.click(screen.getByRole('button', { name: /Thème : Clair/ }))
    expect(document.documentElement).toHaveClass('dark')
  })

  it('ouvre une mini-appli depuis son URL et revient à l’accueil avec Échap', async () => {
    window.location.hash = '#/app/clock'
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Horloge' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByText("Votre écran d'accueil est vide.")).toBeInTheDocument()
  })

  it('affiche une page introuvable pour une appli inconnue', () => {
    window.location.hash = '#/app/nexiste-pas'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Page introuvable' })).toBeInTheDocument()
  })
})
