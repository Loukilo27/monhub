import { expect, test } from '@playwright/test'

test.describe('Notes', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('écrire, mettre en forme, retrouver, épingler, corbeille', async ({ page }) => {
    await page.goto('/#/app/notes')
    await page.getByRole('button', { name: 'Nouvelle note' }).click()

    await page.getByRole('textbox', { name: 'Titre de la note' }).fill('Recette des crêpes')
    const content = page.getByRole('textbox', { name: 'Contenu de la note' })
    await content.click()
    await page.keyboard.type('Ingrédients importants')
    // Mise en forme : gras sur le dernier mot, police manuscrite, surlignage jaune
    // Sélection du mot par une plage de texte (indépendante des polices et des raccourcis du système).
    await page.evaluate(() => {
      const paragraph = [...document.querySelectorAll('.note-content p')].find((p) => p.textContent?.includes('importants'))!
      const node = paragraph.firstChild!
      const start = node.textContent!.indexOf('importants')
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, start + 'importants'.length)
      window.getSelection()!.removeAllRanges()
      window.getSelection()!.addRange(range)
    })
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString().trim())).toBe('importants')
    await page.getByRole('button', { name: 'Gras (Ctrl+B)' }).click()
    await page.getByRole('combobox', { name: 'Police' }).selectOption({ label: 'Manuscrite (Caveat)' })
    await page.getByRole('button', { name: 'Surligner', exact: true }).click()
    await page.getByRole('button', { name: 'Surligner en jaune' }).click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'Cases à cocher' }).click()
    await page.keyboard.type('Farine')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Œufs')
    await page.getByRole('button', { name: 'Couleur de la note' }).click()
    await page.getByRole('radio', { name: 'Jaune' }).click()

    await expect(content.locator('strong')).toHaveText('importants')
    await expect(content.locator('mark')).toHaveText('importants')
    await expect(content.locator('ul[data-type="taskList"] li')).toHaveCount(2)
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'test-results/notes-editeur.png' })

    // Retour à la liste, puis rechargement : la note est conservée avec sa mise en forme.
    await page.getByRole('button', { name: 'Retour aux notes' }).click()
    await expect(page.getByRole('button', { name: /^Recette des crêpes/ })).toContainText('Farine')
    await page.reload()
    await page.getByRole('button', { name: /^Recette des crêpes/ }).click()
    await expect(page.getByRole('textbox', { name: 'Contenu de la note' }).locator('strong')).toHaveText('importants')
    await page.getByRole('button', { name: 'Retour aux notes' }).click()

    // Recherche sans accents
    await page.getByPlaceholder('Rechercher dans les notes').fill('oeufs')
    await expect(page.getByText('Aucune note ne correspond.')).toBeVisible() // « Œufs » ≠ « oeufs »
    await page.getByPlaceholder('Rechercher dans les notes').fill('crepes')
    await expect(page.getByRole('button', { name: /^Recette des crêpes/ })).toBeVisible()
    await page.getByPlaceholder('Rechercher dans les notes').fill('')

    // Épingler
    await page.getByRole('button', { name: 'Épingler « Recette des crêpes »' }).click()
    await expect(page.getByRole('region', { name: 'Notes épinglées' })).toContainText('Recette des crêpes')
    await page.screenshot({ path: 'test-results/notes-liste.png' })

    // Corbeille puis restauration
    await page.getByRole('button', { name: /^Recette des crêpes/ }).click()
    await page.getByRole('button', { name: 'Mettre à la corbeille' }).click()
    await expect(page.getByText('Aucune note pour l’instant.')).toBeVisible()
    await page.getByRole('button', { name: /Corbeille \(1\)/ }).click()
    await expect(page.getByText('Suppression définitive dans 30 jours')).toBeVisible()
    await page.getByRole('button', { name: 'Restaurer' }).click()
    await page.getByRole('button', { name: 'Toutes les notes' }).click()
    await expect(page.getByRole('button', { name: /^Recette des crêpes/ })).toBeVisible()
  })

  test('le widget affiche la note choisie', async ({ page }) => {
    await page.goto('/#/app/notes')
    await page.getByRole('button', { name: 'Nouvelle note' }).click()
    await page.getByRole('textbox', { name: 'Titre de la note' }).fill('Liste de courses')
    await page.getByRole('textbox', { name: 'Contenu de la note' }).click()
    await page.keyboard.type('Pain, beurre, confiture')
    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeVisible({ timeout: 5000 })

    await page.goto('/#/')
    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Aperçu d’une note en 2×2' }).click()
    await page.getByRole('button', { name: 'Terminé' }).click()

    const widget = page.getByRole('group', { name: 'Widget Aperçu d’une note' })
    await widget.getByRole('button', { name: 'Liste de courses' }).click()
    await expect(widget).toContainText('Pain, beurre, confiture')
    // Le choix est enregistré avec la disposition.
    await page.reload()
    await expect(page.getByRole('group', { name: 'Widget Aperçu d’une note' })).toContainText('Pain, beurre, confiture')
    await page.getByRole('button', { name: 'Ouvrir la note « Liste de courses »' }).click()
    await expect(page.getByRole('textbox', { name: 'Titre de la note' })).toHaveValue('Liste de courses')
  })
})
