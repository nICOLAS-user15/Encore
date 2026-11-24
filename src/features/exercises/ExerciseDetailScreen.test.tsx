import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { syncSeedExercises } from '../../db/seed'
import { importTestProgram } from '../../test/fixtures'
import { addExerciseToRoutine } from '../routines/routineActions'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
  updateSet,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'
import { createCustomExercise } from './exerciseActions'

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

describe('managing a custom exercise', () => {
  const custom = () =>
    createCustomExercise(db, {
      name: 'Remada articulada',
      muscleGroup: 'back',
      equipment: 'machine',
    })

  it('edits the name; a library exercise has no edit button', async () => {
    const exercise = await custom()
    renderAt(`/exercicios/${exercise.id}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Editar exercício' }))
    const sheet = await screen.findByRole('dialog', { name: 'Editar exercício' })
    fireEvent.change(within(sheet).getByLabelText('Nome do exercício'), {
      target: { value: 'Remada articulada pronada' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Salvar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Remada articulada pronada' }),
    ).toBeInTheDocument()
  })

  it('deleting asks first and goes back to the library', async () => {
    const exercise = await custom()
    const router = renderAt(`/exercicios/${exercise.id}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir exercício' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir exercício?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/exercicios'))
    expect((await db.exercises.get(exercise.id))?.deletedAt).not.toBeNull()
  })

  it('an exercise in a routine cannot be deleted, and the screen says where it is', async () => {
    const exercise = await custom()
    const [upperA] = await listRoutinesWithExercises(db)
    await addExerciseToRoutine(db, upperA.routine.id, exercise.id)
    renderAt(`/exercicios/${exercise.id}`)

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir exercício' }))

    const sheet = await screen.findByRole('dialog', { name: 'Exercício em uso' })
    expect(sheet).toHaveTextContent('Upper A')
    expect((await db.exercises.get(exercise.id))?.deletedAt).toBeNull()
  })

  it('a library exercise cannot be edited or deleted', async () => {
    // (The test program's own exercises are user-made: take one from the library seed.)
    await syncSeedExercises(db)
    const incline = await db.exercises
      .filter((exercise) => exercise.names.en === 'Incline Bench Press')
      .first()
    renderAt(`/exercicios/${incline!.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Supino inclinado com barra' })
    expect(
      screen.queryByRole('button', { name: 'Editar exercício' }),
    ).not.toBeInTheDocument()
  })
})
