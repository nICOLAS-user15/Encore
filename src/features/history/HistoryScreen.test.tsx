import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { importTestProgram } from '../../test/fixtures'
import { BottomDockProvider } from '../../ui/BottomDock'
import { ToastProvider } from '../../ui/Toast'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await importTestProgram(db)
})

describe('from workout to history', () => {
  it('finishes a workout, shows the detail and the list, and allows deleting', async () => {
    const router = renderAt('/treino')

    // Starts Upper A and completes the first 2 sets (Bench Press, 25 kg × 8).
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    // Each exercise has its own "set 1": [0] is the first exercise's (Bench Press).
    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'Concluir série 1' }))[0],
    )
    await screen.findByRole('button', { name: 'Desfazer série 1' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Concluir série 2' })[0])
    await screen.findByRole('button', { name: 'Desfazer série 2' })

    // Finish (with confirmation).
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar treino' }))
    const dialog = await screen.findByRole('dialog', { name: 'Finalizar treino?' })
    expect(dialog).toHaveTextContent('2 séries concluídas')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }))

    // Goes to the detail. (We wait for the URL, not for a "Voltar" button: the confirmation
    // sheet also has a "Voltar" arrow while it closes.)
    // Only the completed sets stayed.
    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/historico\/.+/),
    )
    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument()
    // The content comes from the database: findBy waits for it to appear.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Upper A' }),
    ).toBeInTheDocument()
    expect(await screen.findAllByText('25 kg × 8')).toHaveLength(2)
    expect(screen.getByText('400 kg')).toBeInTheDocument() // 25 × 8 × 2

    // The history list (via the bottom tab) shows the workout.
    fireEvent.click(screen.getByRole('link', { name: 'Histórico' }))
    const item = await screen.findByRole('link', { name: /Upper A/ })
    expect(item).toHaveTextContent('400 kg')

    // "Voltar" on the detail goes back to the list.
    fireEvent.click(item)
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('link', { name: /Upper A/ })).toBeInTheDocument()

    // Delete: goes back to the list, now empty.
    fireEvent.click(screen.getByRole('link', { name: /Upper A/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir treino' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir treino?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Nada por aqui ainda')).toBeInTheDocument()
  })

  it('a nonexistent id shows "Treino não encontrado"', async () => {
    renderAt('/historico/nao-existe')

    expect(await screen.findByText('Treino não encontrado')).toBeInTheDocument()
  })
})

describe('comparison with the previous time', () => {
  /** Upper A workout completing the first `count` sets (25 kg × 8 on the bench press). */
  async function finishUpperA(count: number) {
    const [upperA] = await listRoutinesWithExercises(db)
    const workout = await startWorkout(db, upperA.routine.id)
    const sets = await listWorkoutSets(db, workout.id)
    for (const set of sets.slice(0, count)) {
      await toggleSetCompleted(db, set.id)
    }
    await finishWorkout(db, workout.id)
    return workout
  }

  it('shows volume, sets and duration relative to the previous Upper A', async () => {
    const first = await finishUpperA(2) // 2 sets: 400 kg
    // Guarantee the order in time (both workouts may land in the same millisecond).
    await db.workouts.update(first.id, { startedAt: first.startedAt - 86_400_000 })
    const second = await finishUpperA(3) // 3 sets: 600 kg

    renderAt(`/historico/${second.id}`)

    const label = await screen.findByText(/^Comparado ao Upper A de/)
    const card = label.parentElement as HTMLElement
    expect(within(card).getByText('+200 kg')).toBeInTheDocument()
    expect(within(card).getByText('+1')).toBeInTheDocument()
  })

  it('the first time of the routine there is no comparison', async () => {
    const only = await finishUpperA(2)

    renderAt(`/historico/${only.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Upper A' })
    expect(screen.queryByText(/^Comparado ao/)).not.toBeInTheDocument()
  })
})

describe('correcting a finished workout', () => {
  /** Upper A with the first `count` bench press sets completed (25 kg × 8), finished. */
  async function finishBench(count: number) {
    const [upperA] = await listRoutinesWithExercises(db)
    const workout = await startWorkout(db, upperA.routine.id)
    const sets = await listWorkoutSets(db, workout.id)
    for (const set of sets.slice(0, count)) {
      await toggleSetCompleted(db, set.id)
    }
    await finishWorkout(db, workout.id)
    return workout
  }

  /** Detail screen with the dock and the toasts ("Desfazer" lives there). */
  function renderDetail(workoutId: string) {
    const router = createMemoryRouter(routes, {
      initialEntries: [`/historico/${workoutId}`],
    })
    render(
      <BottomDockProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </BottomDockProvider>,
    )
  }

  it('tapping a set opens the editor and saving changes the value', async () => {
    renderDetail((await finishBench(2)).id)

    fireEvent.click(await screen.findByRole('button', { name: /^Editar série 1:/ }))
    const editor = await screen.findByRole('dialog', { name: /Série 1/ })
    // A finished set has nothing to complete: only save and delete.
    expect(
      within(editor).queryByRole('button', { name: 'Concluir série' }),
    ).not.toBeInTheDocument()
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Carga' }), {
      target: { value: '30' },
    })
    fireEvent.click(within(editor).getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('30 kg × 8')).toBeInTheDocument()
    expect(screen.getByText('440 kg')).toBeInTheDocument() // 30 × 8 + 25 × 8
  })

  it('deleting a set offers "Desfazer", and "+ Série" logs a forgotten one', async () => {
    renderDetail((await finishBench(2)).id)

    fireEvent.click(await screen.findByRole('button', { name: /^Editar série 2:/ }))
    const editor = await screen.findByRole('dialog', { name: /Série 2/ })
    fireEvent.click(within(editor).getByRole('button', { name: 'Excluir série' }))
    await waitFor(() => expect(screen.getAllByText('25 kg × 8')).toHaveLength(1))

    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }))
    await waitFor(() => expect(screen.getAllByText('25 kg × 8')).toHaveLength(2))

    fireEvent.click(
      screen.getByRole('button', { name: 'Adicionar série em Supino reto com barra' }),
    )
    await waitFor(() => expect(screen.getAllByText('25 kg × 8')).toHaveLength(3))
  })

  it('the only set of the workout cannot be deleted (the workout can)', async () => {
    renderDetail((await finishBench(1)).id)

    fireEvent.click(await screen.findByRole('button', { name: /^Editar série 1:/ }))
    const editor = await screen.findByRole('dialog', { name: /Série 1/ })

    expect(within(editor).getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(
      within(editor).queryByRole('button', { name: 'Excluir série' }),
    ).not.toBeInTheDocument()
  })
})
