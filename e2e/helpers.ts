import { expect, type Page } from '@playwright/test'

/*
 * Shared steps for the end-to-end specs. The app starts in Portuguese (the default
 * language), so the selectors use the Portuguese labels the user sees.
 */

/** Opens the app and waits for the first screen (the Workout tab). */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/treino')
  await expect(page.getByRole('heading', { level: 1, name: 'Treino' })).toBeVisible()
}

/**
 * Waits until the service worker is installed AND controlling the page, so the next
 * reload can be served from the precache even with no network.
 */
export async function waitForOfflineReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  // The first load is not controlled yet (the worker has not claimed it): reload once.
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
}

/**
 * Starts a free workout, adds "Supino reto com barra" and completes one set of
 * `weightKg` x `reps` through the set editor. Leaves the workout open.
 */
export async function logOneSet(
  page: Page,
  weightKg: number,
  reps: number,
): Promise<void> {
  await page.getByRole('button', { name: 'Treino livre' }).click()
  await page.getByRole('button', { name: '+ Adicionar exercício' }).click()

  const picker = page.getByRole('dialog', { name: 'Adicionar exercício' })
  await picker
    .getByRole('searchbox', { name: 'Buscar exercício' })
    .fill('supino reto com barra')
  await picker.getByRole('button', { name: /Supino reto com barra/ }).click()

  await page.getByRole('button', { name: /^Editar série 1/ }).click()
  const editor = page.getByRole('dialog', { name: /Série 1/ })
  await editor.getByRole('textbox', { name: 'Carga' }).fill(String(weightKg))
  await editor.getByRole('textbox', { name: 'Repetições' }).fill(String(reps))
  await editor.getByRole('button', { name: 'Concluir série', exact: true }).click()

  await expect(page.getByRole('button', { name: 'Desfazer série 1' })).toBeVisible()
}

/** Finishes the open workout (with the confirmation) and lands on its history detail. */
export async function finishWorkout(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Finalizar treino' }).click()
  await page
    .getByRole('dialog', { name: 'Finalizar treino?' })
    .getByRole('button', { name: 'Finalizar' })
    .click()
  await expect(page).toHaveURL(/\/historico\/.+/)
}
