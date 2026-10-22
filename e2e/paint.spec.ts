import { expect, test, type Page } from '@playwright/test'

/** Couleur d'un pixel du dessin (coordonnées du document). */
async function pixel(page: Page, x: number, y: number) {
  return page.evaluate(
    ([px, py]) => {
      // null tant que l'éditeur n'est pas affiché (expect.poll réessaie).
      const canvas = document.querySelector('canvas[aria-hidden="true"]') as HTMLCanvasElement | null
      return canvas ? Array.from(canvas.getContext('2d')!.getImageData(px, py, 1, 1).data.slice(0, 3)) : null
    },
    [x, y],
  )
}

/** Point de l'écran correspondant à un point du dessin (1600×1000). */
async function screenPoint(page: Page, x: number, y: number) {
  const box = (await page.getByRole('img', { name: /Zone de dessin/ }).boundingBox())!
  return { x: box.x + (x / 1600) * box.width, y: box.y + (y / 1000) * box.height }
}

async function drag(page: Page, from: [number, number], to: [number, number]) {
  const a = await screenPoint(page, ...from)
  const b = await screenPoint(page, ...to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 15 })
  await page.mouse.up()
}

test.describe('Mini Paint', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('dessiner, remplir, annuler, enregistrer, rouvrir, dupliquer, exporter', async ({ page }) => {
    await page.goto('/#/app/paint')
    await page.getByRole('button', { name: 'Nouveau dessin' }).click()
    await page.getByPlaceholder('Titre (facultatif)').fill('Maison')
    await page.getByRole('button', { name: 'Créer' }).click()
    await expect(page.getByRole('img', { name: 'Zone de dessin « Maison »' })).toBeVisible()

    // Rectangle bleu (contour), puis remplissage rouge de l'intérieur au pot de peinture.
    await page.getByRole('button', { name: 'Couleur #3b82f6' }).click()
    await page.getByRole('button', { name: 'Rectangle (R)' }).click()
    await drag(page, [400, 300], [1200, 800])
    expect(await pixel(page, 800, 300)).toEqual([59, 130, 246])
    await page.getByRole('button', { name: 'Couleur #ef4444' }).click()
    await page.getByRole('button', { name: 'Pot de peinture (G)' }).click()
    const inside = await screenPoint(page, 800, 550)
    await page.mouse.click(inside.x, inside.y)
    expect(await pixel(page, 800, 550)).toEqual([239, 68, 68])
    expect(await pixel(page, 100, 100)).toEqual([255, 255, 255]) // l'extérieur ne change pas

    // Trait au pinceau, annuler / rétablir au clavier
    await page.getByRole('button', { name: 'Pinceau (B)' }).click()
    await page.getByRole('button', { name: 'Couleur #111827' }).click()
    await drag(page, [100, 900], [1500, 900])
    expect(await pixel(page, 800, 900)).toEqual([17, 24, 39])
    await page.keyboard.press('Control+z')
    expect(await pixel(page, 800, 900)).toEqual([255, 255, 255])
    await page.keyboard.press('Control+y')
    expect(await pixel(page, 800, 900)).toEqual([17, 24, 39])

    // Pipette : reprend le rouge
    await page.getByRole('button', { name: 'Pipette (I)' }).click()
    await page.mouse.click(inside.x, inside.y)
    await expect(page.getByRole('button', { name: 'Pinceau (B)' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('input[type="color"]').first()).toHaveValue('#ef4444')

    // Texte
    await page.getByRole('button', { name: 'Texte (T)' }).click()
    const textAt = await screenPoint(page, 450, 100)
    await page.mouse.click(textAt.x, textAt.y)
    await page.getByRole('textbox', { name: 'Texte à ajouter' }).fill('Ma maison')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('status').filter({ hasText: 'Enregistré' })).toBeVisible({ timeout: 10_000 })
    await page.screenshot({ path: 'test-results/paint-editeur.png' })

    // Retour à la galerie : miniature, puis réouverture identique
    await page.getByRole('button', { name: 'Retour à la galerie' }).click()
    await expect(page.getByRole('button', { name: /^Maison/ }).locator('img')).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: /^Maison/ }).click()
    await expect(page.getByRole('img', { name: 'Zone de dessin « Maison »' })).toBeVisible()
    await expect.poll(() => pixel(page, 800, 550), { timeout: 10_000 }).toEqual([239, 68, 68])
    expect(await pixel(page, 800, 900)).toEqual([17, 24, 39])
    await page.getByRole('button', { name: 'Retour à la galerie' }).click()

    // Dupliquer puis exporter
    await page.getByRole('button', { name: 'Actions pour « Maison »' }).click()
    await page.getByRole('menuitem', { name: 'Dupliquer' }).click()
    await expect(page.getByRole('button', { name: /^Maison \(copie\)/ })).toBeVisible()
    await page.getByRole('button', { name: 'Actions pour « Maison »' }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: 'Exporter en PNG' }).click()
    expect((await download).suggestedFilename()).toBe('Maison.png')
    await page.screenshot({ path: 'test-results/paint-galerie.png' })

    // Widget « Dernier dessin »
    await page.goto('/#/')
    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Dernier dessin en 2×2' }).click()
    await page.getByRole('button', { name: 'Terminé' }).click()
    await expect(page.getByRole('img', { name: /Dernier dessin : Maison/ })).toBeVisible()
  })
})
