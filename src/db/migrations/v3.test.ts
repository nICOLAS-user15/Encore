import Dexie from 'dexie'
import { describe, expect, it } from 'vitest'
import { createDatabase, SCHEMA_V1 } from '../db'
import { LEGACY_SPLIT_ID, legacySplitName } from './v3'

const base = { createdAt: 1, updatedAt: 1, deletedAt: null }

/**
 * Cria um banco no formato da VERSÃO 2 (o que está no seu computador e no celular
 * antes desta atualização): rotinas sem `splitId` e sem tabela de divisões.
 */
async function createV2Database(
  name: string,
  routines: Array<{ id: string; name: string; deletedAt?: number | null }>,
  language?: 'pt' | 'en',
) {
  const legacy = new Dexie(name)
  legacy.version(1).stores(SCHEMA_V1)
  legacy
    .version(2)
    .stores({ exercises: 'id, muscleGroup, updatedAt', settings: 'id, updatedAt' })
  await legacy.open()

  await legacy.table('routines').bulkAdd(
    routines.map((routine, order) => ({
      ...base,
      order,
      notes: '',
      deletedAt: null,
      ...routine,
    })),
  )
  await legacy.table('routineExercises').add({
    ...base,
    id: 're1',
    routineId: routines[0]?.id ?? 'r',
    exerciseId: 'e1',
    position: 0,
  })
  await legacy.table('workouts').add({
    ...base,
    id: 'w1',
    routineId: routines[0]?.id ?? null,
    startedAt: 10,
    endedAt: 20,
  })
  if (language) {
    await legacy
      .table('settings')
      .add({ ...base, id: 'app-settings', language, restSeconds: 90 })
  }
  legacy.close()
}

describe('migração v2 -> v3 (divisões de treino)', () => {
  it('põe as rotinas atuais numa divisão "Upper / Lower" sem perder nada', async () => {
    const name = `encore-migration-${crypto.randomUUID()}`
    await createV2Database(name, [
      { id: 'r1', name: 'Upper A' },
      { id: 'r2', name: 'Lower A' },
      { id: 'r3', name: 'Upper B' },
      { id: 'r4', name: 'Lower B' },
    ])

    const db = createDatabase(name)
    await db.open()

    const splits = await db.splits.toArray()
    expect(splits).toHaveLength(1)
    expect(splits[0]).toMatchObject({
      id: LEGACY_SPLIT_ID,
      name: 'Upper / Lower',
      order: 0,
      deletedAt: null,
    })

    // Todas as rotinas apontam para a divisão, na mesma ordem de antes.
    const routines = await db.routines.orderBy('order').toArray()
    expect(routines.map((routine) => [routine.name, routine.splitId])).toEqual([
      ['Upper A', LEGACY_SPLIT_ID],
      ['Lower A', LEGACY_SPLIT_ID],
      ['Upper B', LEGACY_SPLIT_ID],
      ['Lower B', LEGACY_SPLIT_ID],
    ])
    // A mudança fica visível para backup e sincronização.
    expect(routines.every((routine) => routine.updatedAt > 1)).toBe(true)

    // O resto dos dados não foi tocado.
    expect(await db.routineExercises.count()).toBe(1)
    expect((await db.workouts.get('w1'))?.routineId).toBe('r1')

    await db.delete()
  })

  it('rotinas com outros nomes vão para "Minhas rotinas" (ou "My routines" em inglês)', async () => {
    const portuguese = `encore-migration-${crypto.randomUUID()}`
    await createV2Database(portuguese, [{ id: 'r1', name: 'Peito e tríceps' }])
    const db = createDatabase(portuguese)
    await db.open()
    expect((await db.splits.toArray()).map((split) => split.name)).toEqual([
      'Minhas rotinas',
    ])
    await db.delete()

    const english = `encore-migration-${crypto.randomUUID()}`
    await createV2Database(english, [{ id: 'r1', name: 'Chest day' }], 'en')
    const dbEn = createDatabase(english)
    await dbEn.open()
    expect((await dbEn.splits.toArray()).map((split) => split.name)).toEqual([
      'My routines',
    ])
    await dbEn.delete()
  })

  it('sem rotinas (ou só com rotinas excluídas), não cria divisão nenhuma', async () => {
    const empty = `encore-migration-${crypto.randomUUID()}`
    await createV2Database(empty, [])
    const dbEmpty = createDatabase(empty)
    await dbEmpty.open()
    expect(await dbEmpty.splits.count()).toBe(0)
    await dbEmpty.delete()

    const deleted = `encore-migration-${crypto.randomUUID()}`
    await createV2Database(deleted, [{ id: 'r1', name: 'Velha', deletedAt: 5 }])
    const dbDeleted = createDatabase(deleted)
    await dbDeleted.open()
    expect(await dbDeleted.splits.count()).toBe(0)
    await dbDeleted.delete()
  })
})

describe('legacySplitName', () => {
  it('só "Upper..." e "Lower..." contam como o programa Upper / Lower', () => {
    expect(legacySplitName(['Upper A', 'lower b'], 'pt')).toBe('Upper / Lower')
    expect(legacySplitName(['Upper A', 'Push'], 'pt')).toBe('Minhas rotinas')
    expect(legacySplitName([], 'pt')).toBe('Minhas rotinas')
  })
})
