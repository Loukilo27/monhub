import { expect, test, type Page } from '@playwright/test'

/** Disposition enregistrée par le mode démo (localStorage). */
async function savedLayout(page: Page, kind: 'desktop' | 'mobile') {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), `monhub.demo.layout.${kind}`)
}

test.describe('Accueil sur PC', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('personnaliser l’accueil puis ouvrir une mini-appli', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Ton écran d’accueil est vide.')).toBeVisible()

    await page.getByRole('button', { name: 'Modifier' }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Horloge en 4×2' }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le raccourci Notes' }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le raccourci Calendrier' }).click()
    await page.screenshot({ path: 'test-results/pc-edition.png' })
    await page.getByRole('button', { name: 'Terminé' }).click()

    // La disposition survit au rechargement.
    await page.reload()
    await expect(page.getByRole('link', { name: 'Notes' })).toBeVisible()
    await expect(page.getByRole('group', { name: /Widget Horloge/ })).toContainText(/\d{2}:\d{2}/)
    await page.screenshot({ path: 'test-results/pc-accueil.png' })

    await page.getByRole('link', { name: 'Notes' }).click()
    await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('link', { name: 'Calendrier' })).toBeVisible()
  })

  test('glisser-déposer un raccourci sans chevauchement', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() =>
      localStorage.setItem(
        'monhub.demo.layout.desktop',
        JSON.stringify({
          items: [
            { id: 'a', type: 'shortcut', appId: 'notes', page: 0, x: 0, y: 0, w: 1, h: 1 },
            { id: 'b', type: 'shortcut', appId: 'todo', page: 0, x: 5, y: 3, w: 1, h: 1 },
          ],
          pageCount: 1,
        }),
      ),
    )
    await page.reload()
    // Clic droit = mode édition.
    await page.getByRole('link', { name: 'Notes' }).click({ button: 'right' })
    const source = page.getByRole('button', { name: /Raccourci notes/ })
    const target = page.getByRole('button', { name: /Raccourci todo/ })
    const from = (await source.boundingBox())!
    const to = (await target.boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
    await page.mouse.up()

    const layout = await savedLayout(page, 'desktop')
    const moved = layout.items.find((item: { id: string }) => item.id === 'a')
    // La case visée est occupée : l'élément se place juste à côté.
    expect(Math.abs(moved.x - 5) + Math.abs(moved.y - 3)).toBe(1)
  })
})

test.describe('Accueil sur Android', () => {
  test.skip(({ isMobile }) => !isMobile, 'Parcours mobile')

  test('appui long, ajout et pages multiples', async ({ page }) => {
    await page.goto('/')
    // Une page pleine (4×6) : le prochain élément ira sur une deuxième page.
    await page.evaluate(() =>
      localStorage.setItem(
        'monhub.demo.layout.mobile',
        JSON.stringify({
          items: [...Array(24).keys()].map((index) => ({
            id: `i${index}`,
            type: 'shortcut',
            appId: ['clock', 'todo', 'calendar', 'notes', 'music', 'paint'][index % 6],
            page: 0,
            x: index % 4,
            y: Math.floor(index / 4),
            w: 1,
            h: 1,
          })),
          pageCount: 1,
        }),
      ),
    )
    await page.reload()
    await page.screenshot({ path: 'test-results/android-accueil.png' })

    // Appui long (doigt posé ~0,6 s sans bouger) sur une icône : passage en mode édition.
    const first = page.getByRole('link', { name: 'Horloge' }).first()
    const box = (await first.boundingBox())!
    const touch = { pointerType: 'touch', isPrimary: true, clientX: box.x + 10, clientY: box.y + 10 }
    await first.dispatchEvent('pointerdown', touch)
    await page.waitForTimeout(600)
    // Le lien a été remplacé par un élément déplaçable : on relève le doigt sur la fenêtre.
    await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' })))
    await expect(page.getByRole('button', { name: 'Terminé' })).toBeVisible()
    await expect(page).toHaveURL(/#\/$|\/$/)

    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Horloge en 2×2' }).click()
    await page.screenshot({ path: 'test-results/android-edition.png' })
    await page.getByRole('button', { name: 'Terminé' }).click()

    const layout = await savedLayout(page, 'mobile')
    expect(layout.pageCount).toBe(2)
    expect(layout.items.at(-1)).toMatchObject({ type: 'widget', page: 1, x: 0, y: 0, w: 2, h: 2 })
  })
})
