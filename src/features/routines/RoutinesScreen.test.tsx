import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import type { Workout } from '../../db/types'
import { syncSeedExercises } from '../../db/seed'
import { startWorkout, toggleSetCompleted } from '../workout/workoutActions'
import { getActiveWorkout, listWorkoutSets } from '../workout/workoutQueries'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from './routineQueries'

function renderRoutines() {
  const router = createMemoryRouter(routes, { initialEntries: ['/rotinas'] })
  render(<RouterProvider router={router} />)
  return router
}

let upperAWorkout: Workout

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await syncSeedExercises(db)
  await importTestProgram(db)
  // Upper A workout already in progress.
  const [upperA] = await listRoutinesWithExercises(db)
  upperAWorkout = await startWorkout(db, upperA.routine.id)
})

/** Completes the first set of Upper A: the workout now has something to lose. */
async function completeOneSet() {
  const [first] = await listWorkoutSets(db, upperAWorkout.id)
  await toggleSetCompleted(db, first.id)
}

describe('Rotinas with a workout in progress', () => {
  it('the routine of the open workout shows "Continuar" and leads to it', async () => {
    const router = renderRoutines()

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/treino/${upperAWorkout.id}`),
    )
  })

  it('with sets done, starting ANOTHER routine warns first and does not create another workout', async () => {
    await completeOneSet()
    const router = renderRoutines()

    // Routine order: Upper A (in progress), Lower A, Upper B, Lower B.
    const [startLowerA] = await screen.findAllByRole('button', { name: 'Iniciar' })
    fireEvent.click(startLowerA)

    expect(
      await screen.findByRole('dialog', { name: 'Treino em andamento' }),
    ).toHaveTextContent('Upper A ainda está em andamento')
    expect(router.state.location.pathname).toBe('/rotinas')

    fireEvent.click(screen.getByRole('button', { name: 'Ir para o treino' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/treino/${upperAWorkout.id}`),
    )
    expect((await getActiveWorkout(db))?.id).toBe(upperAWorkout.id)
  })

  it('with no sets done, switches routine right away (the empty workout is discarded)', async () => {
    const router = renderRoutines()

    const [startLowerA] = await screen.findAllByRole('button', { name: 'Iniciar' })
    fireEvent.click(startLowerA)

    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/treino\/.+/))
    const active = await getActiveWorkout(db)
    expect(active?.id).not.toBe(upperAWorkout.id)
    expect((await db.workouts.get(upperAWorkout.id))?.deletedAt).not.toBeNull()
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Lower A' }),
    ).toBeInTheDocument()
  })
})
