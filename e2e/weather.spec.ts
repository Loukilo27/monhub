import { expect, test, type Page } from '@playwright/test'

const CITIES = {
  lyon: { name: 'Lyon', admin1: 'Auvergne-Rhône-Alpes', country: 'France', latitude: 45.75, longitude: 4.85, timezone: 'Europe/Paris' },
  paris: { name: 'Paris', admin1: 'Île-de-France', country: 'France', latitude: 48.85, longitude: 2.35, timezone: 'Europe/Paris' },
}

/** Prévisions factices : il est 14:30 dans la ville. */
function forecast(temperature: number, code: number) {
  const hours = Array.from({ length: 12 }, (_, index) => `2026-10-30T${String(12 + index).padStart(2, '0')}:00`)
  return {
    current: { time: '2026-10-30T14:30', temperature_2m: temperature, apparent_temperature: temperature - 2, weather_code: code, is_day: 1, wind_speed_10m: 12, relative_humidity_2m: 70 },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, index) => temperature + (index % 3)),
      weather_code: hours.map(() => code),
      is_day: hours.map((_, index) => (index < 6 ? 1 : 0)),
      precipitation_probability: hours.map((_, index) => index * 5),
    },
    daily: {
      time: ['2026-10-30', '2026-10-31', '2026-11-01'],
      weather_code: [code, 0, 3],
      temperature_2m_max: [temperature + 3, 16, 14],
      temperature_2m_min: [temperature - 5, 5, 6],
      precipitation_probability_max: [40, 0, 10],
      sunrise: ['2026-10-30T07:22', '2026-10-31T07:24', '2026-11-01T07:25'],
      sunset: ['2026-10-30T17:31', '2026-10-31T17:29', '2026-11-01T17:27'],
    },
  }
}

async function mockOpenMeteo(page: Page) {
  await page.route('https://geocoding-api.open-meteo.com/**', (route) => {
    const name = new URL(route.request().url()).searchParams.get('name')?.toLowerCase() ?? ''
    const results = Object.values(CITIES).filter((city) => city.name.toLowerCase().startsWith(name))
    return route.fulfill({ json: { results } })
  })
  await page.route('https://api.open-meteo.com/**', (route) => {
    const latitude = Number(new URL(route.request().url()).searchParams.get('latitude'))
    return route.fulfill({ json: latitude > 47 ? forecast(8, 61) : forecast(12.6, 2) })
  })
}

test.describe('Météo', () => {
  test.skip(({ isMobile }) => isMobile, 'Parcours PC')

  test('villes, prévisions, favorite et widget avec changement de ville', async ({ page }) => {
    await mockOpenMeteo(page)
    await page.goto('/#/app/weather')

    // Première ville : devient la favorite.
    await expect(page.getByText('Ajoute une ville pour voir sa météo')).toBeVisible()
    await page.getByRole('textbox', { name: 'Rechercher une ville' }).fill('Lyo')
    await page.getByRole('list', { name: 'Villes trouvées' }).getByRole('button', { name: /Lyon/ }).click()
    await expect(page.getByRole('heading', { name: 'Lyon', level: 2 })).toBeVisible()
    await expect(page.getByText('13°', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Partiellement nuageux')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ville favorite' })).toHaveAttribute('aria-pressed', 'true')

    // Deuxième ville, prévisions heure par heure et jour par jour.
    await page.getByRole('button', { name: 'Ajouter une ville' }).click()
    await page.getByRole('textbox', { name: 'Rechercher une ville' }).fill('Par')
    await page.getByRole('list', { name: 'Villes trouvées' }).getByRole('button', { name: /Paris/ }).click()
    await expect(page.getByRole('heading', { name: 'Paris', level: 2 })).toBeVisible()
    await expect(page.getByText('Pluie faible')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Prochaines heures' })).toContainText('15 h')
    const days = page.getByRole('region', { name: 'Prochains jours' })
    await expect(days).toContainText('Aujourd’hui')
    await expect(days).toContainText('Demain')
    await page.getByRole('button', { name: 'Définir comme ville favorite' }).click()
    await expect(page.getByRole('button', { name: 'Ville favorite' })).toHaveAttribute('aria-pressed', 'true')
    await page.screenshot({ path: 'test-results/meteo.png', fullPage: true })

    // Widget : la favorite (Paris), puis la flèche passe à Lyon sans ouvrir l'appli.
    await page.goto('/#/')
    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await page.getByRole('button', { name: 'Ajouter le widget Météo d’une ville en 4×2' }).click()
    await page.getByRole('button', { name: 'Terminé' }).click()
    const widget = page.getByRole('group', { name: 'Widget Météo d’une ville' })
    await expect(widget).toContainText('Paris')
    await expect(widget).toContainText('8°')
    await expect(widget).toContainText('15 h')
    await widget.getByRole('button', { name: /Ville suivante/ }).click()
    await expect(widget).toContainText('Lyon')
    await expect(widget).toContainText('13°')
    await expect(page.getByRole('button', { name: 'Modifier', exact: true })).toBeVisible()
    await page.screenshot({ path: 'test-results/meteo-widget.png' })

    // Le choix est gardé ; un clic ouvre l'appli sur la ville affichée.
    await page.reload()
    await expect(widget).toContainText('Lyon')
    await widget.getByRole('button', { name: /Météo de Lyon/ }).click()
    await expect(page.getByRole('heading', { name: 'Lyon', level: 2 })).toBeVisible()

    // Retirer une ville.
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Retirer Lyon' }).click()
    await expect(page.getByRole('navigation', { name: 'Mes villes' }).getByRole('button', { name: 'Lyon' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Paris', level: 2 })).toBeVisible()
  })
})
