import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
  updateSet,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

/** A finished workout where the first bench press set was `weightKg` x `reps`. */
async function trainBench(weightKg: number, reps: number) {
  const [first] = await listRoutinesWithExercises(db)
  const workout = await startWorkout(db, first.routine.id)
  const [set] = await listWorkoutSets(db, workout.id)
  await updateSet(db, set.id, { weightKg, reps })
  await toggleSetCompleted(db, set.id)
  await finishWorkout(db, workout.id)
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await importTestProgram(db)
})

describe('exercise detail', () => {
  it('opens from the Exercises tab and shows bests, charts and sessions', async () => {
    await trainBench(60, 10)
    await trainBench(70, 6)
    const router = renderAt('/exercicios')

    fireEvent.click(await screen.findByRole('link', { name: /Supino reto com barra/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Supino reto com barra' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/exercicios\/.+/)
    // Heaviest load 70 kg; best estimated 1RM 84 kg (70 x 6).
    // (The same values also label the charts, so look inside the bests card.)
    expect(screen.getByText('Maior carga').nextElementSibling).toHaveTextContent('70 kg')
    expect(screen.getByText('1RM estimado').nextElementSibling).toHaveTextContent('84 kg')
    // The charts describe themselves for screen readers.
    expect(
      screen.getByRole('img', {
        name: '1RM estimado por sessão: de 80 kg a 84 kg em 2 sessões',
      }),
    ).toBeInTheDocument()
    // Sessions, newest first, each linking to its workout.
    const sessions = screen.getAllByRole('link', { name: /Melhor série/ })
    expect(sessions).toHaveLength(2)
    expect(within(sessions[0]).getByText('Melhor série: 70 kg × 6')).toBeInTheDocument()
  })

  it('an exercise never trained shows an empty state instead of a chart', async () => {
    renderAt('/exercicios')

    fireEvent.click(await screen.findByRole('link', { name: /Supino reto com barra/ }))

    expect(await screen.findByText('Sem histórico ainda')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
