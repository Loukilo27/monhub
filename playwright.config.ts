import { defineConfig, devices } from '@playwright/test'

// Tests de bout en bout en mode démo (données locales, sans compte Supabase).
// En local on utilise Edge, déjà installé sur Windows ; en CI le Chromium de Playwright.
const channel = process.env.CI ? undefined : 'msedge'
const port = 5175

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'pc',
      use: { ...devices['Desktop Chrome'], channel, viewport: { width: 1440, height: 900 }, screen: { width: 1920, height: 1080 } },
    },
    {
      name: 'android',
      use: { ...devices['Pixel 7'], channel },
    },
  ],
  webServer: {
    command: `npm run dev:demo -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
})
