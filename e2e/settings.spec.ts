import { expect, test } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'
import { readFileSync } from 'node:fs'

test.describe('Réglages', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('format d’heure et fuseau horaire', async ({ page }) => {
    await page.goto('/#/settings')
    await page.getByRole('radio', { name: '12 heures' }).click()
    await expect(page.getByText(/^Il est \d{2}:\d{2} (AM|PM)\.$/)).toBeVisible()

    await page.getByRole('combobox', { name: 'Fuseau horaire' }).selectOption('Asia/Tokyo')
    await expect(page.getByText('Fuseau horaire changé : alarmes et rappels reprogrammés.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Utiliser celui de cet appareil \(Europe\/Paris\)/ })).toBeVisible()
    await page.screenshot({ path: 'test-results/reglages.png', fullPage: true })

    // L'accueil suit les deux réglages.
    const expected = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h12', timeZone: 'Asia/Tokyo' })
    await page.goto('/#/')
    await expect(page.locator('header time')).toHaveText(new RegExp(`^(${expected.format(new Date())}|${expected.format(new Date(Date.now() + 60_000))})$`))

    await page.goto('/#/settings')
    await page.getByRole('radio', { name: '24 heures' }).click()
    await expect(page.getByText(/^Il est \d{2}:\d{2}\.$/)).toBeVisible()
  })

  test('sauvegarde : exporter puis restaurer', async ({ page }) => {
    await page.goto('/#/')
    await page.evaluate(() => localStorage.setItem('monhub.demo.rows.notes', JSON.stringify([{ id: 'note-1', title: 'Note sauvegardée' }])))
    await page.goto('/#/settings')

    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exporter mes données' }).click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/^monhub-sauvegarde-\d{4}-\d{2}-\d{2}\.zip$/)
    await expect(page.getByText('Sauvegarde téléchargée.')).toBeVisible()
    const path = await file.path()
    const data = JSON.parse(strFromU8(unzipSync(readFileSync(path))['monhub.json']))
    expect(data.format).toBe('monhub-sauvegarde')
    expect(data.tables.notes).toEqual([{ id: 'note-1', title: 'Note sauvegardée' }])

    // Donnée perdue… puis restaurée depuis le fichier.
    await page.evaluate(() => localStorage.removeItem('monhub.demo.rows.notes'))
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Restaurer la sauvegarde')
      void dialog.accept()
    })
    await page.getByLabel('Fichier de sauvegarde').setInputFiles(path)
    await expect(page.getByText('Sauvegarde restaurée.')).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('monhub.demo.rows.notes') ?? '[]'))).toEqual([{ id: 'note-1', title: 'Note sauvegardée' }])

    // Un fichier quelconque est refusé.
    await page.getByLabel('Fichier de sauvegarde').setInputFiles({ name: 'photo.zip', mimeType: 'application/zip', buffer: Buffer.from('pas un zip') })
    await expect(page.getByText('Ce fichier n’est pas une archive ZIP valide.')).toBeVisible()
  })

  test('hors-ligne : modification mise en attente puis envoyée au retour du réseau', async ({ page, context }) => {
    await page.goto('/#/')
    const themeButton = page.getByRole('button', { name: /^Thème :/ })
    await expect(themeButton).toBeVisible()
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('monhub.demo.settings') ?? 'null')?.theme ?? null)

    await context.setOffline(true)
    await themeButton.click()
    const status = page.getByRole('status').filter({ hasText: 'Hors-ligne' })
    await expect(status).toContainText('1 modification en attente')
    // Rien n'est encore écrit : la modification attend dans la file.
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('monhub.demo.settings') ?? 'null')?.theme ?? null)).toBe(before)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('monhub.outbox') ?? '[]').length)).toBe(1)

    await context.setOffline(false)
    await expect(status).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => localStorage.getItem('monhub.outbox'))).toBeNull()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('monhub.demo.settings') ?? 'null')?.theme)).not.toBe(before)
  })
})
