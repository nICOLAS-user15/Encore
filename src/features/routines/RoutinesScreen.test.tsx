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
  // Treino do Upper A já em andamento.
  const [upperA] = await listRoutinesWithExercises(db)
  upperAWorkout = await startWorkout(db, upperA.routine.id)
})

/** Conclui a primeira série do Upper A: o treino passa a ter algo a perder. */
async function completeOneSet() {
  const [first] = await listWorkoutSets(db, upperAWorkout.id)
  await toggleSetCompleted(db, first.id)
}

describe('Rotinas com um treino em andamento', () => {
  it('a rotina do treino aberto mostra "Continuar" e leva até ele', async () => {
    const router = renderRoutines()

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/treino/${upperAWorkout.id}`),
    )
  })

  it('com séries feitas, iniciar OUTRA rotina avisa antes e não cria outro treino', async () => {
    await completeOneSet()
    const router = renderRoutines()

    // Ordem das rotinas: Upper A (em andamento), Lower A, Upper B, Lower B.
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

  it('sem nenhuma série feita, troca de rotina na hora (o treino vazio é descartado)', async () => {
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
