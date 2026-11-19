import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

/**
 * End-to-end tests run against the REAL production build (`vite preview`), because the
 * service worker (and so offline mode) only exists there.
 *
 * Locally you can reuse the Chrome you already have instead of downloading Chromium:
 * `E2E_CHANNEL=chrome pnpm e2e`. In CI, Chromium is installed by `playwright install`.
 */
export default defineConfig({
  testDir: 'e2e',
  // Each spec starts from an empty browser profile, so they can run in parallel.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // A phone-sized viewport with touch, like the real use.
    ...devices['Pixel 7'],
    channel: process.env.E2E_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
