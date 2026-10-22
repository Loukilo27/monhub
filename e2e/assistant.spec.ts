import { expect, test } from '@playwright/test'

test.describe('Assistant IA', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('Ctrl+K, réponse sourcée, actions confirmées ou annulées', async ({ page }) => {
    await page.goto('/#/')
    await page.keyboard.press('Control+k')
    const panel = page.getByRole('dialog', { name: 'Assistant' })
    await expect(panel).toBeVisible()

    // Réponse avec sources
    await panel.getByRole('button', { name: 'Quel temps fait-il à Paris ?' }).click()
    await expect(panel.getByText('14 °C')).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Open-Meteo' })).toBeVisible()

    // Création confirmée
    await panel.getByRole('textbox', { name: 'Message pour l’assistant' }).fill('Crée une alarme pour demain matin')
    await panel.getByRole('textbox', { name: 'Message pour l’assistant' }).press('Enter')
    const confirmation = panel.getByRole('alertdialog', { name: 'Confirmer les actions' })
    await expect(confirmation).toContainText('Créer une alarme à 07:30 « Réveil démo »')
    await page.screenshot({ path: 'test-results/assistant-confirmation.png' })
    await confirmation.getByRole('button', { name: 'Confirmer' }).click()
    await expect(panel.getByText('C’est fait ! (mode démo)')).toBeVisible()
    await expect(panel.getByText(/✅ Créer une alarme à 07:30/)).toBeVisible()

    // Création annulée
    await panel.getByRole('textbox', { name: 'Message pour l’assistant' }).fill('Encore une alarme')
    await panel.getByRole('button', { name: 'Envoyer' }).click()
    await panel.getByRole('alertdialog', { name: 'Confirmer les actions' }).getByRole('button', { name: 'Annuler' }).click()
    await expect(panel.getByText('D’accord, je n’ai rien fait.')).toBeVisible()

    // Action sans confirmation : thème sombre
    await panel.getByRole('textbox', { name: 'Message pour l’assistant' }).fill('Passe en mode sombre')
    await panel.getByRole('button', { name: 'Envoyer' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.screenshot({ path: 'test-results/assistant.png' })

    // L'alarme confirmée existe bien (une seule).
    await page.keyboard.press('Escape')
    await page.goto('/#/app/clock?tab=alarmes')
    await expect(page.getByRole('button', { name: 'Modifier l’alarme de 07:30' })).toHaveCount(1)

    // Bouton flottant sur les pages d'applis
    await page.getByRole('button', { name: 'Assistant (Ctrl+K)' }).click()
    await expect(page.getByRole('dialog', { name: 'Assistant' })).toBeVisible()
  })
})
