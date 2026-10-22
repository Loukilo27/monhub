import { expect, test } from '@playwright/test'

test.describe('To-do', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('saisie rapide, édition, sous-tâches et récurrence', async ({ page }) => {
    await page.goto('/#/app/todo?view=all')
    // Listes créées au premier lancement
    await expect(page.getByRole('navigation', { name: 'Vues et listes' }).getByRole('button', { name: 'Courses', exact: true })).toBeVisible()

    // Saisie rapide en langage naturel
    const quick = page.getByRole('textbox', { name: 'Ajouter une tâche' })
    await quick.fill('Appeler le garage demain 14h #voiture !1')
    await expect(page.getByText('#voiture').first()).toBeVisible() // aperçu
    await quick.press('Enter')
    await expect(page.getByRole('button', { name: /Appeler le garage/ })).toContainText('Demain 14:00')
    await expect(page.getByRole('button', { name: /Appeler le garage/ })).toContainText('#voiture')

    // Tâche hebdomadaire avec sous-tâches
    await quick.fill('Arroser les plantes')
    await quick.press('Enter')
    await page.getByRole('button', { name: /Arroser les plantes/ }).click()
    const editor = page.getByRole('dialog', { name: 'Modifier la tâche' })
    await editor.locator('input[type="date"]').first().fill('2026-10-26')
    await editor.getByLabel('Fréquence').selectOption('WEEKLY')
    await expect(editor.getByText('Chaque semaine le lundi')).toBeVisible()
    await editor.getByPlaceholder('Ajouter une sous-tâche').fill('Salon')
    await editor.getByPlaceholder('Ajouter une sous-tâche').press('Enter')
    await editor.getByPlaceholder('Ajouter une sous-tâche').fill('Balcon')
    await editor.getByPlaceholder('Ajouter une sous-tâche').press('Enter')
    await expect(editor.getByText('0/2')).toBeVisible()
    await editor.getByRole('checkbox', { name: 'Salon' }).click()
    await expect(editor.getByText('1/2')).toBeVisible()
    await editor.getByRole('button', { name: 'Enregistrer' }).click()
    await page.screenshot({ path: 'test-results/todo-liste.png' })

    // Cocher la tâche récurrente crée la semaine suivante (lundi 2 novembre)
    await page.getByRole('checkbox', { name: 'Cocher « Arroser les plantes »' }).click()
    await expect(page.getByRole('button', { name: /Arroser les plantes/ })).toContainText('lun. 2 nov.')
    await expect(page.getByRole('button', { name: /Arroser les plantes/ })).toContainText('0/2')

    // L'occurrence faite est dans « Terminées »
    await page.getByRole('navigation', { name: 'Vues et listes' }).getByRole('button', { name: 'Terminées' }).click()
    await expect(page.getByRole('button', { name: /Arroser les plantes/ })).toBeVisible()
  })

  test('le widget coche une tâche du jour depuis l’accueil', async ({ page }) => {
    await page.goto('/#/app/todo?view=today')
    await page.getByRole('textbox', { name: 'Ajouter une tâche' }).fill('Payer la cantine')
    await page.getByRole('textbox', { name: 'Ajouter une tâche' }).press('Enter')
    await expect(page.getByRole('button', { name: /Payer la cantine/ })).toContainText('Aujourd’hui')

    await page.goto('/#/')
    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Tâches du jour en 4×2' }).click()
    await page.getByRole('button', { name: 'Terminé' }).click()

    const widget = page.getByRole('group', { name: 'Widget Tâches du jour' })
    await expect(widget).toContainText('Payer la cantine')
    await widget.getByRole('checkbox', { name: 'Cocher « Payer la cantine »' }).click()
    await expect(widget).toContainText('Rien de prévu')
    // Cocher n'a pas ouvert l'appli
    await expect(page.getByRole('button', { name: 'Modifier', exact: true })).toBeVisible()
  })
})
