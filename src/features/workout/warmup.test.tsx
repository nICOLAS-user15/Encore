import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { createDatabase, db as appDb, type EncoreDB } from '../../db/db'
import { syncSeedExercises } from '../../db/seed'
import type { SetEntry } from '../../db/types'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  addSet,
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
  updateSet,
} from './workoutActions'
import { getLastPerformance, listWorkoutSets } from './workoutQueries'
import {
  completedWorkingSets,
  groupSetsByExercise,
  numberSets,
  totalVolumeKg,
  warmupValues,
} from './workoutStats'

function makeSet(overrides: Partial<SetEntry>): SetEntry {
  return {
    id: crypto.randomUUID(),
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    workoutId: 'w1',
    exerciseId: 'a',
    position: 0,
    weightKg: 0,
    reps: 0,
    type: 'normal',
    completedAt: null,
    ...overrides,
  }
}

describe('warm-up: rules', () => {
  it('appears first in the exercise, even if added later', () => {
    const sets = [
      makeSet({ position: 0, type: 'normal' }),
      makeSet({ position: 1, type: 'normal' }),
      makeSet({ position: 2, type: 'warmup' }),
    ]

    const [group] = groupSetsByExercise(sets)

    expect(group.sets.map((s) => s.type)).toEqual(['warmup', 'normal', 'normal'])
  })

  it('gets no number: the working sets stay 1, 2, 3', () => {
    const sets = [
      makeSet({ type: 'warmup' }),
      makeSet({ type: 'normal' }),
      makeSet({ type: 'encore' }),
    ]

    expect(numberSets(sets)).toEqual([null, 1, 2])
  })

  it('does not count toward volume or completed sets', () => {
    const sets = [
      makeSet({ type: 'warmup', weightKg: 20, reps: 10, completedAt: 1 }),
      makeSet({ type: 'normal', weightKg: 40, reps: 8, completedAt: 2 }),
    ]

    expect(totalVolumeKg(sets)).toBe(320)
    expect(completedWorkingSets(sets)).toHaveLength(1)
  })

  it('suggests half the load of the first set, in multiples of 2.5 kg', () => {
    expect(warmupValues([makeSet({ weightKg: 65, reps: 7 })])).toEqual({
      weightKg: 32.5,
      reps: 7,
    })
    expect(warmupValues([makeSet({ weightKg: 25, reps: 8 })])).toEqual({
      weightKg: 12.5,
      reps: 8,
    })
    expect(warmupValues([])).toEqual({ weightKg: 0, reps: 0 })
  })
})

describe('warm-up: in the database', () => {
  let db: EncoreDB

  beforeEach(async () => {
    db = createDatabase(`encore-test-${crypto.randomUUID()}`)
    await importTestProgram(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('does not enter the "last time" of the next workout', async () => {
    const [upperA] = await listRoutinesWithExercises(db)
    const bench = upperA.items[0].exerciseId
    const workout = await startWorkout(db, upperA.routine.id)

    const warmup = await addSet(db, workout.id, bench, 'warmup')
    expect(warmup).toMatchObject({ type: 'warmup', weightKg: 12.5, reps: 8 })
    await updateSet(db, warmup.id, { weightKg: 10, reps: 15 })
    await toggleSetCompleted(db, warmup.id)
    const [firstWorking] = (await listWorkoutSets(db, workout.id)).filter(
      (set) => set.exerciseId === bench && set.type === 'normal',
    )
    await toggleSetCompleted(db, firstWorking.id)
    await finishWorkout(db, workout.id)

    const last = await getLastPerformance(db, bench)
    expect(last?.sets.map((set) => [set.weightKg, set.reps])).toEqual([[25, 8]])
  })
})

describe('warm-up: on screen', () => {
  beforeEach(async () => {
    await Promise.all(appDb.tables.map((table) => table.clear()))
    localStorage.clear()
    await syncSeedExercises(appDb)
    await importTestProgram(appDb)
  })

  it('"+ Aquecimento" creates the "AQ" set at the top of the exercise', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/treino'] })
    render(<RouterProvider router={router} />)
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    // "+ Aquecimento" lives in the ⋯ menu of the exercise card.
    fireEvent.click(
      await screen.findByRole('button', { name: 'Mais opções: Supino reto com barra' }),
    )
    const menu = await screen.findByRole('dialog', { name: 'Supino reto com barra' })
    fireEvent.click(within(menu).getByRole('button', { name: '+ Aquecimento' }))

    const warmupRow = await screen.findByRole('button', { name: /^Editar série AQ/ })
    expect(warmupRow).toHaveTextContent('12,5 kg × 8')
    // Still the first in the exercise list, before set 1.
    const list = warmupRow.closest('ol')
    expect(list).not.toBeNull()
    const rows = within(list as HTMLElement).getAllByRole('button', {
      name: /^Editar série/,
    })
    expect(rows[0]).toBe(warmupRow)
    expect(rows[1]).toHaveAccessibleName(/^Editar série 1/)
  })
})
