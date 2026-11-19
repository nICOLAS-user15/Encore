import { fireEvent, render, screen, within } from '@testing-library/react'
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
  updateSet,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'
import { getWorkoutRecordIds } from './recordsQueries'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <BottomDockProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </BottomDockProvider>,
  )
  return router
}

/** A finished workout where the first set of the first exercise was done at `weightKg` x 8. */
async function trainOnce(weightKg: number) {
  const [first] = await listRoutinesWithExercises(db)
  const workout = await startWorkout(db, first.routine.id)
  const [set] = await listWorkoutSets(db, workout.id)
  await updateSet(db, set.id, { weightKg, reps: 8 })
  await toggleSetCompleted(db, set.id)
  await finishWorkout(db, workout.id)
  return workout
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await importTestProgram(db)
})

describe('personal records in the active workout', () => {
  it('completing a heavier set than ever before shows the PR badge and a notice', async () => {
    await trainOnce(25)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    // Set 1 comes pre-filled with last time (25 kg x 8): raise it to 30 kg and complete it.
    const [firstSet] = await screen.findAllByRole('button', { name: /^Editar série 1:/ })
    fireEvent.click(firstSet)
    const editor = await screen.findByRole('dialog', { name: /Série 1/ })
    fireEvent.change(within(editor).getByRole('textbox', { name: 'Carga' }), {
      target: { value: '30' },
    })
    fireEvent.click(within(editor).getByRole('button', { name: 'Concluir série' }))

    expect(
      await screen.findByRole('button', { name: /^Editar série 1: .*recorde pessoal$/ }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/^Novo recorde:/)).toBeInTheDocument()
  })

  it('the first time an exercise is ever done is not a record', async () => {
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    const [firstCheck] = await screen.findAllByRole('button', {
      name: 'Concluir série 1',
    })
    fireEvent.click(firstCheck)
    await screen.findByRole('button', { name: 'Desfazer série 1' })

    expect(
      screen.queryByRole('button', { name: /recorde pessoal/ }),
    ).not.toBeInTheDocument()
  })
})

describe('getWorkoutRecordIds (history detail)', () => {
  it('an old workout is judged only against what came before it', async () => {
    const light = await trainOnce(25)
    const heavy = await trainOnce(40)

    const heavySets = await listWorkoutSets(db, heavy.id)
    const lightSets = await listWorkoutSets(db, light.id)

    // 40 kg beat 25 kg: record. The 25 kg workout came first: nothing to beat.
    expect(
      (
        await getWorkoutRecordIds(
          db,
          { workoutId: heavy.id, startedAt: heavy.startedAt },
          heavySets,
        )
      ).size,
    ).toBe(1)
    expect(
      (
        await getWorkoutRecordIds(
          db,
          { workoutId: light.id, startedAt: light.startedAt },
          lightSets,
        )
      ).size,
    ).toBe(0)
  })
})
