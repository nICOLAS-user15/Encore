import { expect, test } from '@playwright/test'
import { finishWorkout, logOneSet, openApp, waitForOfflineReady } from './helpers'

// The project's headline promise: the app works with no network at all.
test('opens, logs a workout and keeps the data while offline', async ({
  page,
  context,
}) => {
  await openApp(page)
  await waitForOfflineReady(page)

  await context.setOffline(true)
  await page.reload()
  // The whole app came from the service worker precache (code, styles, fonts).
  await expect(page.getByRole('heading', { level: 1, name: 'Treino' })).toBeVisible()

  // Everything keeps working offline: IndexedDB is the source of truth.
  await logOneSet(page, 100, 5)
  await page.reload()
  await expect(page.getByRole('button', { name: /^Editar série 1/ })).toBeVisible()

  await finishWorkout(page)
  await expect(page.getByText('500 kg')).toBeVisible()
})
