import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { createDatabase, db as appDb, type EncoreDB } from '../../db/db'
import { syncSeedExercises } from '../../db/seed'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  addSet,
  applyLoadSuggestion,
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
  updateSet,
} from './workoutActions'
import { listWorkoutSets } from './workoutQueries'

/** Longer wait for screens that depend on several database queries. */
const SLOW = { timeout: 5000 }

/**
 * Upper A workout in which the bench press (3 × 6–10, 25 kg) hit the top: 25 × 10 in
 * all sets. Returns the bench press id.
 */
async function finishBenchAtTopOfRange(db: EncoreDB) {
  const [upperA] = await listRoutinesWithExercises(db)
  const bench = upperA.items[0].exerciseId
  const workout = await startWorkout(db, upperA.routine.id)
  const benchSets = (await listWorkoutSets(db, workout.id)).filter(
    (set) => set.exerciseId === bench,
  )
  for (const set of benchSets) {
    await updateSet(db, set.id, { reps: 10 })
    await toggleSetCompleted(db, set.id)
  }
  await finishWorkout(db, workout.id)
  return { routineId: upperA.routine.id, bench }
}

describe('applyLoadSuggestion (in the database)', () => {
  let db: EncoreDB

  beforeEach(async () => {
    db = createDatabase(`encore-test-${crypto.randomUUID()}`)
    await importTestProgram(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('changes only the planned sets still pending for this exercise', async () => {
    const { routineId, bench } = await finishBenchAtTopOfRange(db)
    const workout = await startWorkout(db, routineId)
    const warmup = await addSet(db, workout.id, bench, 'warmup')
    const [first] = (await listWorkoutSets(db, workout.id)).filter(
      (set) => set.exerciseId === bench && set.type === 'normal',
    )
    await toggleSetCompleted(db, first.id) // the 1st was already done: does not change

    const changed = await applyLoadSuggestion(db, workout.id, bench, {
      weightKg: 27.5,
      reps: 6,
    })

    expect(changed).toBe(2)
    const after = await listWorkoutSets(db, workout.id)
    const benchAfter = after.filter((set) => set.exerciseId === bench)
    expect(benchAfter.find((set) => set.id === first.id)).toMatchObject({
      weightKg: 25,
      reps: 10,
    })
    expect(benchAfter.find((set) => set.id === warmup.id)?.weightKg).toBe(warmup.weightKg)
    expect(
      benchAfter
        .filter((set) => set.type === 'normal' && set.completedAt === null)
        .map((set) => [set.weightKg, set.reps]),
    ).toEqual([
      [27.5, 6],
      [27.5, 6],
    ])
    // The other exercises do not change.
    expect(after.filter((set) => set.weightKg === 27.5)).toHaveLength(2)
  })
})

describe('load suggestion on screen', () => {
  beforeEach(async () => {
    await Promise.all(appDb.tables.map((table) => table.clear()))
    localStorage.clear()
    await syncSeedExercises(appDb)
    await importTestProgram(appDb)
  })

  it('after hitting the top of the range, suggests raising the load and "Aplicar" fills in', async () => {
    const { routineId } = await finishBenchAtTopOfRange(appDb)
    const workout = await startWorkout(appDb, routineId)

    const router = createMemoryRouter(routes, {
      initialEntries: [`/treino/${workout.id}`],
    })
    render(<RouterProvider router={router} />)

    // Many database reads before the 1st screen: with the machine busy (all
    // tests in parallel), the default 1s is sometimes not enough.
    const apply = await screen.findByRole(
      'button',
      { name: 'Aplicar sugestão em Supino reto com barra' },
      SLOW,
    )
    // The suggestion block: "Sugestão · Subir carga" + 27,5 kg × 6 (barbell: 2.5 kg step).
    const suggestionBlock = apply.parentElement as HTMLElement
    expect(suggestionBlock).toHaveTextContent('Subir carga')
    expect(suggestionBlock).toHaveTextContent('27,5 kg × 6')

    fireEvent.click(apply)

    await waitFor(
      () => expect(within(suggestionBlock).getByText('Aplicada')).toBeTruthy(),
      SLOW,
    )
    // The 3 bench press sets (first exercise) now have the suggestion.
    const benchRows = screen
      .getAllByRole('button', { name: /^Editar série/ })
      .slice(0, 3)
      .map((row) => row.textContent)
    expect(benchRows.every((text) => text?.includes('27,5 kg × 6'))).toBe(true)
  })

  it('with no exercise history, no suggestion appears', async () => {
    const [upperA] = await listRoutinesWithExercises(appDb)
    const workout = await startWorkout(appDb, upperA.routine.id)

    const router = createMemoryRouter(routes, {
      initialEntries: [`/treino/${workout.id}`],
    })
    render(<RouterProvider router={router} />)

    await screen.findByRole('heading', { level: 1, name: 'Upper A' })
    // "Referência" only appears after the last-time query has answered (empty):
    // this way the test looks at the already loaded cards, not a still blank screen.
    expect(await screen.findAllByText(/^Referência/, {}, SLOW)).not.toHaveLength(0)
    expect(screen.queryByText(/Sugestão/)).not.toBeInTheDocument()
  })
})
