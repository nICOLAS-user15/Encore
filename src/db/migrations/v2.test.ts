import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { getLastPerformance } from '../../features/workout/workoutQueries'
import { createDatabase, SCHEMA_V1 } from '../db'

const SEED_BENCH = 'd583a392-b227-4970-a6ff-07c929916fd3' // "Supino reto com barra" no seed
const base = { createdAt: 1, updatedAt: 1, deletedAt: null }

/** Cria um banco no formato ANTIGO (versão 1), como o que está no seu celular. */
async function createLegacyDatabase(name: string) {
  const legacy = new Dexie(name)
  legacy.version(1).stores(SCHEMA_V1)
  await legacy.open()

  await legacy.table('exercises').bulkAdd([
    // Do seed (nome só em português)
    {
      id: SEED_BENCH,
      name: 'Supino reto com barra',
      muscleGroup: 'chest',
      equipment: 'barbell',
      isCustom: false,
      ...base,
    },
    // Criados pelo programa Upper/Lower (nome em inglês). O primeiro é duplicado do seed.
    {
      id: 'program-bench',
      name: 'Bench Press',
      muscleGroup: 'chest',
      equipment: 'barbell',
      isCustom: true,
      ...base,
    },
    {
      id: 'program-tbar',
      name: 'T-Bar Row',
      muscleGroup: 'back',
      equipment: 'barbell',
      isCustom: true,
      ...base,
    },
    // Um nome que a migração não conhece
    {
      id: 'mine',
      name: 'Meu exercício',
      muscleGroup: 'core',
      equipment: 'machine',
      isCustom: true,
      ...base,
    },
  ])
  await legacy.table('routineExercises').add({
    id: 're1',
    routineId: 'r1',
    exerciseId: 'program-bench',
    position: 0,
    targetSets: 3,
    targetRepsMin: 6,
    targetRepsMax: 10,
    referenceWeightKg: 25,
    referenceReps: 8,
    notes: '',
    ...base,
  })
  await legacy.table('workouts').add({
    id: 'w1',
    routineId: 'r1',
    startedAt: 1000,
    endedAt: 5000,
    notes: '',
    ...base,
  })
  await legacy.table('setEntries').add({
    id: 's1',
    workoutId: 'w1',
    exerciseId: 'program-bench',
    position: 0,
    weightKg: 30,
    reps: 8,
    type: 'normal',
    completedAt: 2000,
    ...base,
  })

  legacy.close()
}

describe('migração v1 -> v2', () => {
  it('traduz nomes, junta duplicados sem perder séries e preenche o cronômetro', async () => {
    const name = `encore-migration-${crypto.randomUUID()}`
    await createLegacyDatabase(name)

    // Abrir com o código novo dispara a migração.
    const db = createDatabase(name)
    await db.open()

    // Nomes nos dois idiomas; o campo antigo `name` some.
    const bench = await db.exercises.get(SEED_BENCH)
    expect(bench?.names).toEqual({ pt: 'Supino reto com barra', en: 'Bench Press' })
    expect(bench && 'name' in bench).toBe(false)
    expect((await db.exercises.get('program-tbar'))?.names).toEqual({
      pt: 'Remada cavalinho',
      en: 'T-Bar Row',
    })
    expect((await db.exercises.get('mine'))?.names).toEqual({
      pt: 'Meu exercício',
      en: 'Meu exercício',
    })

    // O duplicado foi excluído (lógico) e tudo que apontava para ele foi para o seed.
    expect((await db.exercises.get('program-bench'))?.deletedAt).toBeTypeOf('number')
    expect((await db.routineExercises.get('re1'))?.exerciseId).toBe(SEED_BENCH)
    expect((await db.setEntries.get('s1'))?.exerciseId).toBe(SEED_BENCH)

    // O histórico do exercício unificado encontra a série antiga (índice atualizado).
    const last = await getLastPerformance(db, SEED_BENCH)
    expect(last?.sets.map((set) => set.id)).toEqual(['s1'])

    // Cronômetro: treinos antigos usam o início e o fim que já tinham.
    expect(await db.workouts.get('w1')).toMatchObject({
      timerStartedAt: 1000,
      timerStoppedAt: 5000,
    })

    // Tabela nova existe.
    expect(await db.settings.count()).toBe(0)

    await db.delete()
  })
})
