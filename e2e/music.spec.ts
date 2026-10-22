import { expect, test } from '@playwright/test'

test.describe('Musique', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('statistiques, classements, playlists et widgets', async ({ page }) => {
    // Pas de chargement réel du lecteur Spotify pendant les tests.
    await page.route('https://open.spotify.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Lecteur Spotify</p>' }))
    await page.goto('/#/app/music')

    await expect(page.getByText('En écoute', { exact: true })).toBeVisible()
    await expect(page.getByText('Get Lucky')).toBeVisible()
    await expect(page.getByText('Écoutes · octobre 2026')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Écoutes par jour' })).toBeVisible()
    await expect(page.getByText('Artiste n° 1')).toBeVisible()

    // Info-bulle au survol d'une barre
    await page.getByRole('img', { name: 'Écoutes par jour' }).locator('rect').nth(4).hover()
    await expect(page.getByRole('status').filter({ hasText: /écoutes? · 5/ })).toBeVisible()

    // Classements et périodes
    await page.getByRole('tab', { name: 'Titres' }).click()
    await expect(page.getByText('Titre phare 1', { exact: true })).toBeVisible()
    await page.getByRole('tab', { name: 'Cette année' }).click()
    await expect(page.getByRole('img', { name: 'Écoutes par mois' })).toBeVisible()
    await page.screenshot({ path: 'test-results/musique.png', fullPage: true })

    // Playlist par lien
    await page.getByRole('textbox', { name: 'Lien Spotify' }).fill('https://open.spotify.com/intl-fr/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')
    await page.getByRole('textbox', { name: 'Nom (facultatif)' }).fill('Hits du moment')
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await expect(page.locator('iframe[title="Hits du moment"]')).toHaveAttribute('src', 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M')
    await page.getByRole('textbox', { name: 'Lien Spotify' }).fill('https://example.com/x')
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await expect(page.getByText('Lien Spotify non reconnu')).toBeVisible()

    // Widgets
    await page.goto('/#/')
    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget En écoute en 4×1' }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Top artistes du mois en 4×2' }).click()
    await page.getByRole('button', { name: 'Terminé' }).click()
    await expect(page.getByRole('group', { name: 'Widget En écoute' })).toContainText('Get Lucky')
    await expect(page.getByRole('group', { name: 'Widget Top artistes du mois' })).toContainText('Ziak')
    await page.screenshot({ path: 'test-results/musique-widgets.png' })
  })
})
