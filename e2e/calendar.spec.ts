import { expect, test } from '@playwright/test'

test.describe('Calendrier', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('créer un rendez-vous récurrent et voir les tâches datées', async ({ page }) => {
    // Une tâche datée d'aujourd'hui doit apparaître dans le calendrier.
    await page.goto('/#/app/todo?view=today')
    await page.getByRole('textbox', { name: 'Ajouter une tâche' }).fill('Envoyer le devis 16h')
    await page.getByRole('textbox', { name: 'Ajouter une tâche' }).press('Enter')
    await expect(page.getByRole('button', { name: /Envoyer le devis/ })).toBeVisible()

    await page.goto('/#/app/calendar')
    await page.getByRole('button', { name: 'Semaine' }).click()
    await expect(page.getByText('Envoyer le devis')).toBeVisible()

    // Nouvel événement hebdomadaire avec deux rappels
    await page.getByRole('button', { name: 'Nouvel événement' }).click()
    const editor = page.getByRole('dialog', { name: 'Nouvel événement' })
    await editor.getByPlaceholder('Titre').fill('Cours de piano')
    await editor.getByPlaceholder('Lieu').fill('Conservatoire')
    await editor.getByLabel('Fréquence').selectOption('WEEKLY')
    await editor.getByLabel('Ajouter un rappel').selectOption('1440')
    await expect(editor.getByText('15 min avant')).toBeVisible() // rappel par défaut
    await expect(editor.getByText('1 jour avant')).toBeVisible()
    await editor.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.locator('.fc-event', { hasText: 'Cours de piano' })).toHaveCount(1)

    // La série apparaît chaque semaine
    await page.getByRole('button', { name: 'Suivant' }).click()
    await expect(page.locator('.fc-event', { hasText: 'Cours de piano' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Mois' }).click()
    expect(await page.locator('.fc-event', { hasText: 'Cours de piano' }).count()).toBeGreaterThanOrEqual(3)
    await page.screenshot({ path: 'test-results/calendrier-mois.png' })

    // Supprimer une seule occurrence
    await page.locator('.fc-event', { hasText: 'Cours de piano' }).last().click()
    const edit = page.getByRole('dialog', { name: 'Modifier l’événement' })
    await edit.getByRole('button', { name: 'Supprimer l’événement' }).click()
    const before = await page.locator('.fc-event', { hasText: 'Cours de piano' }).count()
    await edit.getByRole('button', { name: 'Cette occurrence' }).click()
    await expect(page.locator('.fc-event', { hasText: 'Cours de piano' })).toHaveCount(before - 1)

    // Agenda
    await page.getByRole('button', { name: 'Agenda' }).click()
    await expect(page.getByText('Cours de piano').first()).toBeVisible()
    await page.screenshot({ path: 'test-results/calendrier-agenda.png' })
  })

  test('cocher une tâche depuis le calendrier', async ({ page }) => {
    await page.goto('/#/app/todo?view=today')
    await page.getByRole('textbox', { name: 'Ajouter une tâche' }).fill('Réserver le restaurant')
    await page.getByRole('textbox', { name: 'Ajouter une tâche' }).press('Enter')
    await page.goto('/#/app/calendar')
    await page.getByRole('button', { name: 'Semaine' }).click()
    await page.getByRole('checkbox', { name: 'Cocher « Réserver le restaurant »' }).click()
    await expect(page.getByRole('checkbox', { name: 'Décocher « Réserver le restaurant »' })).toBeVisible()
    await page.screenshot({ path: 'test-results/calendrier-semaine.png' })
  })
})
