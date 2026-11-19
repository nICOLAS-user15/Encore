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

/** Espera maior para telas que dependem de várias consultas ao banco. */
const SLOW = { timeout: 5000 }

/**
 * Treino do Upper A em que o supino (3 × 6–10, 25 kg) bateu o topo: 25 × 10 em
 * todas as séries. Devolve o id do supino.
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

describe('applyLoadSuggestion (no banco)', () => {
  let db: EncoreDB

  beforeEach(async () => {
    db = createDatabase(`encore-test-${crypto.randomUUID()}`)
    await importTestProgram(db)
  })

  afterEach(async () => {
    await db.delete()
  })

  it('muda só as séries planejadas que faltam deste exercício', async () => {
    const { routineId, bench } = await finishBenchAtTopOfRange(db)
    const workout = await startWorkout(db, routineId)
    const warmup = await addSet(db, workout.id, bench, 'warmup')
    const [first] = (await listWorkoutSets(db, workout.id)).filter(
      (set) => set.exerciseId === bench && set.type === 'normal',
    )
    await toggleSetCompleted(db, first.id) // a 1ª já foi feita: não muda

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
    // Os outros exercícios não mudam.
    expect(after.filter((set) => set.weightKg === 27.5)).toHaveLength(2)
  })
})

describe('sugestão de carga na tela', () => {
  beforeEach(async () => {
    await Promise.all(appDb.tables.map((table) => table.clear()))
    localStorage.clear()
    await syncSeedExercises(appDb)
    await importTestProgram(appDb)
  })

  it('depois de bater o topo da faixa, sugere subir a carga e o "Aplicar" preenche', async () => {
    const { routineId } = await finishBenchAtTopOfRange(appDb)
    const workout = await startWorkout(appDb, routineId)

    const router = createMemoryRouter(routes, {
      initialEntries: [`/treino/${workout.id}`],
    })
    render(<RouterProvider router={router} />)

    // Muita leitura no banco antes da 1ª tela: com a máquina ocupada (todos os
    // testes em paralelo), o padrão de 1s às vezes não basta.
    const apply = await screen.findByRole(
      'button',
      { name: 'Aplicar sugestão em Supino reto com barra' },
      SLOW,
    )
    // O bloco da sugestão: "Sugestão · Subir carga" + 27,5 kg × 6 (barra: salto de 2,5 kg).
    const suggestionBlock = apply.parentElement as HTMLElement
    expect(suggestionBlock).toHaveTextContent('Subir carga')
    expect(suggestionBlock).toHaveTextContent('27,5 kg × 6')

    fireEvent.click(apply)

    await waitFor(
      () => expect(within(suggestionBlock).getByText('Aplicada')).toBeTruthy(),
      SLOW,
    )
    // As 3 séries do supino (primeiro exercício) agora estão com a sugestão.
    const benchRows = screen
      .getAllByRole('button', { name: /^Editar série/ })
      .slice(0, 3)
      .map((row) => row.textContent)
    expect(benchRows.every((text) => text?.includes('27,5 kg × 6'))).toBe(true)
  })

  it('sem histórico do exercício, não aparece sugestão', async () => {
    const [upperA] = await listRoutinesWithExercises(appDb)
    const workout = await startWorkout(appDb, upperA.routine.id)

    const router = createMemoryRouter(routes, {
      initialEntries: [`/treino/${workout.id}`],
    })
    render(<RouterProvider router={router} />)

    await screen.findByRole('heading', { level: 1, name: 'Upper A' })
    // "Referência" só aparece depois que a consulta da última vez respondeu (vazia):
    // assim o teste olha os cartões já carregados, e não uma tela ainda em branco.
    expect(await screen.findAllByText(/^Referência/, {}, SLOW)).not.toHaveLength(0)
    expect(screen.queryByText(/Sugestão/)).not.toBeInTheDocument()
  })
})
