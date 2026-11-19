import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { syncSeedExercises } from '../db/seed'
import { startWorkout, startWorkoutTimer } from '../features/workout/workoutActions'
import { I18nProvider } from '../i18n/I18nProvider'
import { routes } from './routes'

function renderApp(initialEntries: string[]) {
  const router = createMemoryRouter(routes, { initialEntries })
  // With the real I18nProvider, changing the language in Settings changes the whole app.
  render(
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>,
  )
  return router
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await syncSeedExercises(db)
})

describe('navigation', () => {
  it('side menu opens, navigates and closes', async () => {
    const router = renderApp(['/treino'])

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }))
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    // The logo with "glitch" has a red copy that is visual only: screen readers hear it once.
    expect(within(menu).getAllByRole('img', { name: 'Encore' })).toHaveLength(1)
    fireEvent.click(within(menu).getByRole('link', { name: 'Sobre o Encore' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sobre' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sobre')
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('side menu closes when tapping outside it, but not inside', async () => {
    renderApp(['/treino'])

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }))
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    fireEvent.click(menu) // tap on the panel itself: stays open
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument()

    // The transparent area around the panel is the <dialog> itself.
    fireEvent.click(menu.closest('dialog') as HTMLDialogElement)
    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument(),
    )
  })

  it('"Voltar" goes back to the previous screen', async () => {
    const router = renderApp(['/rotinas'])

    fireEvent.click(await screen.findByRole('link', { name: 'Configurações' }))
    expect(router.state.location.pathname).toBe('/configuracoes')
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rotinas' }),
    ).toBeInTheDocument()
  })

  it('"Voltar" with no previous page goes to the parent screen', async () => {
    const router = renderApp(['/configuracoes'])

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Treino' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treino')
  })

  it('the chosen workout has "Voltar" to the list; once begun, the list offers "Continuar"', async () => {
    const router = renderApp(['/treino'])

    // Picks a workout: it opens on its own route, with "Voltar" at the top.
    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/treino\/.+/))
    const workoutPath = router.state.location.pathname
    // Begins it: starts the timer.
    fireEvent.click(await screen.findByRole('button', { name: 'Iniciar cronômetro' }))
    await waitFor(async () =>
      expect((await db.workouts.toArray())[0].timerStartedAt).not.toBeNull(),
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))

    // Back at the workout list; the workout is still open and can be resumed.
    await waitFor(() => expect(router.state.location.pathname).toBe('/treino'))
    fireEvent.click(
      await screen.findByRole('link', { name: 'Continuar treino Treino livre' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe(workoutPath))
  })

  it('opening the app on the workout in progress: "Voltar" goes to the list', async () => {
    const workout = await startWorkout(db, null)
    await startWorkoutTimer(db, workout.id)
    // Opening the app lands on /treino, which jumps straight to the workout (replace).
    const router = renderApp(['/treino'])
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/treino/${workout.id}`),
    )

    // Nothing behind it in the history: "Voltar" must still lead somewhere.
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/treino'))
  })

  it('a workout only opened is not "in progress": the list shows no "Continuar"', async () => {
    const router = renderApp(['/treino'])

    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/treino\/.+/))
    const workoutPath = router.state.location.pathname
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/treino'))
    expect(
      screen.queryByRole('link', { name: /Continuar treino/ }),
    ).not.toBeInTheDocument()
    // Tapping it again reopens the same workout (nothing typed is lost).
    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(workoutPath))
  })
})

describe('"Treino em andamento" banner', () => {
  it('shows outside the Treino tab and leads back to the workout', async () => {
    const workout = await startWorkout(db, null)
    await startWorkoutTimer(db, workout.id)
    const router = renderApp(['/historico'])

    const banner = await screen.findByRole('link', {
      name: 'Voltar ao treino Treino livre',
    })
    fireEvent.click(banner)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/treino/${workout.id}`),
    )
    // On the workout screen itself, the banner disappears.
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: /Voltar ao treino/ }),
      ).not.toBeInTheDocument(),
    )
  })

  it('does not show without a workout in progress', async () => {
    renderApp(['/historico'])

    await screen.findByRole('heading', { level: 1, name: 'Histórico' })
    expect(
      screen.queryByRole('link', { name: /Voltar ao treino/ }),
    ).not.toBeInTheDocument()
  })

  it('does not show for a workout only opened (no timer, no set completed)', async () => {
    await startWorkout(db, null)
    renderApp(['/historico'])

    await screen.findByRole('heading', { level: 1, name: 'Histórico' })
    // The Treino tab goes to the list, not into the opened workout.
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    await waitFor(() =>
      expect(within(nav).getByRole('link', { name: 'Treino' })).toHaveAttribute(
        'href',
        '/treino',
      ),
    )
    expect(
      screen.queryByRole('link', { name: /Voltar ao treino/ }),
    ).not.toBeInTheDocument()
  })
})

describe('settings', () => {
  it('switching to English translates the whole app, including the exercises', async () => {
    renderApp(['/exercicios', '/configuracoes'])

    fireEvent.click(await screen.findByRole('button', { name: 'English' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Exercises' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Supino reto com barra')).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en-US')
  })

  it('saves the rest duration and the automatic start', async () => {
    renderApp(['/configuracoes'])

    fireEvent.click(await screen.findByRole('button', { name: '2:00' }))
    const autoRest = screen.getByRole('switch', { name: /Começar o descanso/ })
    expect(autoRest).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(autoRest)

    // Saving is asynchronous: waitFor repeats the check until it passes (or times out).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '2:00' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await screen.findByRole('switch', { name: /Começar o descanso/, checked: false })
    const saved = await db.settings.toArray()
    expect(saved[0]).toMatchObject({ restSeconds: 120, autoStartRest: false })
  })
})
