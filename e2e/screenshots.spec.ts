import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { buildShowcaseBackup, SHOWCASE_NOW } from './showcaseData'

/*
 * README screenshots (not a test): `pnpm e2e:screenshots` writes them to docs/img/.
 * It runs only in the "screenshots" project (playwright.config.ts), never in CI.
 *
 * The app is shown in English, to match the README. The data is fictitious and is
 * loaded through the real Import button; the clock is frozen so every run produces
 * the same images.
 */

const IMAGES = path.resolve(import.meta.dirname, '../docs/img')

test('capture the README screenshots', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(SHOWCASE_NOW)
  await page.goto('/treino')
  await expect(page.getByRole('heading', { level: 1, name: 'Treino' })).toBeVisible()

  // English first, then the fictitious history.
  await page.getByRole('link', { name: 'Configurações' }).click()
  await page.getByRole('button', { name: 'English' }).click()
  const file = testInfo.outputPath('showcase-backup.json')
  await writeFile(file, JSON.stringify(buildShowcaseBackup()))
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(
    page.getByRole('status').filter({ hasText: 'Backup imported' }),
  ).toBeVisible()

  // 1. The workout in progress (the Workout tab points to it).
  await page.getByRole('link', { name: 'Workout', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Legs' })).toBeVisible()
  // The "last time" line and the suggestion load a moment later.
  await expect(page.getByText(/^Last time/).first()).toBeVisible()
  await page.screenshot({
    path: path.join(IMAGES, 'workout.png'),
    animations: 'disabled',
  })

  // Finish it: its legs volume joins the week, and the "in progress" strip leaves the dock.
  await page.getByRole('button', { name: 'Finish workout' }).click()
  await page
    .getByRole('dialog', { name: 'Finish workout?' })
    .getByRole('button', { name: 'Finish', exact: true })
    .click()
  await expect(page).toHaveURL(/\/historico\/.+/)

  // 2. History, with this week's volume by muscle group.
  await page.getByRole('link', { name: 'History', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible()
  await page.screenshot({
    path: path.join(IMAGES, 'history.png'),
    animations: 'disabled',
  })

  // 3. The progress of one exercise.
  await page.getByRole('link', { name: 'Exercises', exact: true }).click()
  await page.getByRole('link', { name: /^Bench Press/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Bench Press' })).toBeVisible()
  await expect(page.getByRole('img', { name: /^Estimated 1RM/ })).toBeVisible()
  await page.screenshot({
    path: path.join(IMAGES, 'progress.png'),
    animations: 'disabled',
  })
})
