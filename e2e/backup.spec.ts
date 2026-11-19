import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { finishWorkout, logOneSet, openApp } from './helpers'

test('export a backup and import it into a clean browser profile', async ({
  page,
  browser,
}, testInfo) => {
  // Without the Web Share API the app falls back to a normal file download,
  // which is what a desktop browser (and this test) does.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined })
  })
  await openApp(page)
  await logOneSet(page, 60, 10)
  await finishWorkout(page)

  // Opening a URL from scratch always lands on the Workout tab (startPage.ts), so
  // navigate through the UI. The finished workout's detail is an inner screen (no
  // settings link): go to a main tab first.
  await page.getByRole('link', { name: 'Histórico' }).click()
  await page.getByRole('link', { name: 'Configurações' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup' }).click()
  const file = testInfo.outputPath('backup.json')
  await (await download).saveAs(file)
  expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({
    format: 'encore-backup',
  })

  // A brand-new profile (empty IndexedDB): import and find the workout.
  const clean = await browser.newContext(testInfo.project.use)
  const other = await clean.newPage()
  await other.goto('/treino')
  await other.getByRole('link', { name: 'Configurações' }).click()
  await other.locator('input[type="file"]').setInputFiles(file)
  await expect(
    other.getByRole('status').filter({ hasText: 'Backup importado' }),
  ).toBeVisible()

  await other.getByRole('link', { name: 'Histórico' }).click()
  // The volume also shows in the "This week" card: check the workout's own card.
  await expect(other.getByRole('link', { name: /Treino livre/ })).toContainText('600 kg')
  await clean.close()
})
