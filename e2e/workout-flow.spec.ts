import { expect, test } from '@playwright/test'
import { finishWorkout, logOneSet, openApp } from './helpers'

test('log a set, finish the workout and find it in the history', async ({ page }) => {
  await openApp(page)

  await logOneSet(page, 80, 8)
  await finishWorkout(page)

  // Detail of the finished workout: 80 kg x 8 = 640 kg of volume.
  await expect(page.getByText('80 kg × 8')).toBeVisible()
  await expect(page.getByText('640 kg')).toBeVisible()

  // And it shows up in the History tab.
  await page.getByRole('link', { name: 'Histórico' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Histórico' })).toBeVisible()
  await expect(page.getByText('Treino livre')).toBeVisible()
  await expect(page.getByText('640 kg')).toBeVisible()
})
