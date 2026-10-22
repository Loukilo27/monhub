import { expect, test } from '@playwright/test'

test.describe('Horloge', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('fuseaux, alarme et chronomètre', async ({ page }) => {
    await page.goto('/#/app/clock')
    await expect(page.getByRole('tab', { name: 'Horloge' })).toHaveAttribute('aria-selected', 'true')

    // Fuseaux horaires
    await page.getByRole('tab', { name: 'Fuseaux' }).click()
    await page.getByRole('button', { name: 'Ajouter une ville' }).click()
    await page.getByPlaceholder('Tokyo, New York…').fill('tokyo')
    await page.getByRole('button', { name: /^Tokyo Japon/ }).click()
    await expect(page.getByText('Tokyo')).toBeVisible()
    await expect(page.getByText(/\+(7|8) h/)).toBeVisible()

    // Alarme en semaine à 06:45
    await page.getByRole('tab', { name: 'Alarmes' }).click()
    await page.getByRole('button', { name: 'Nouvelle alarme' }).click()
    await page.locator('input[type="time"]').fill('06:45')
    await page.getByPlaceholder('Réveil, Sport…').fill('Réveil')
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByRole('button', { name: 'Modifier l’alarme de 06:45' })).toContainText('Réveil · En semaine')
    await expect(page.getByText(/Prochaine alarme dans/)).toBeVisible()

    // Chronomètre avec deux tours
    await page.getByRole('tab', { name: 'Chrono' }).click()
    await page.getByRole('button', { name: 'Démarrer' }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'Tour' }).click()
    await page.waitForTimeout(500)
    await page.getByRole('button', { name: 'Tour' }).click()
    await page.getByRole('button', { name: 'Pause' }).click()
    await expect(page.getByText('meilleur')).toBeVisible()
    await expect(page.getByText('plus lent')).toBeVisible()
    await page.screenshot({ path: 'test-results/horloge-chrono.png' })

    // Le chronomètre est conservé en changeant de page.
    await page.keyboard.press('Escape')
    await page.goto('/#/app/clock?tab=chrono')
    await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible()
  })

  test('un minuteur fait sonner l’écran plein', async ({ page }) => {
    await page.goto('/#/app/clock?tab=minuteurs')
    await page.getByText('heures').locator('..').locator('input').fill('0')
    await page.getByText('minutes', { exact: true }).locator('..').locator('input').fill('0')
    await page.getByText('secondes').locator('..').locator('input').fill('2')
    await page.getByPlaceholder('Nom (facultatif)').fill('Thé')
    await page.getByRole('button', { name: 'Lancer' }).click()
    await expect(page.getByText('En cours')).toBeVisible()

    const ringing = page.getByRole('dialog', { name: 'Minuteur terminé' })
    await expect(ringing).toBeVisible({ timeout: 6000 })
    await expect(ringing).toContainText('Thé')
    await page.screenshot({ path: 'test-results/horloge-sonnerie.png' })
    await ringing.getByRole('button', { name: 'Arrêter' }).click()
    await expect(ringing).toBeHidden()
    await expect(page.getByText('Prêt')).toBeVisible()
  })
})
