import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase, SCHEMA_VERSION, type EncoreDB } from './db'
import { listActiveExercises } from './queries'
import {
  createRecord,
  isActive,
  restoreRecord,
  softDelete,
  updateRecord,
} from './repository'
import { SEED_EXERCISES, syncSeedExercises } from './seed'
import { MUSCLE_GROUPS, type Exercise, type SetEntry } from './types'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const benchPress = {
  names: { pt: 'Supino teste', en: 'Test bench' },
  muscleGroup: 'chest',
  equipment: 'barbell',
  isCustom: true,
} as const

let db: EncoreDB

beforeEach(() => {
  // Banco novo e com nome único em cada teste: nenhum teste interfere no outro.
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  vi.useRealTimers()
  await db.delete()
})

describe('createRecord', () => {
  it('gera UUID e preenche as datas automaticamente', async () => {
    const exercise = await createRecord(db.exercises, benchPress)

    expect(exercise.id).toMatch(UUID_PATTERN)
    expect(exercise.createdAt).toBeTypeOf('number')
    expect(exercise.updatedAt).toBe(exercise.createdAt)
    expect(exercise.deletedAt).toBeNull()
    expect(await db.exercises.get(exercise.id)).toEqual(exercise)
  })

  it('gera um id diferente para cada registro', async () => {
    const a = await createRecord(db.exercises, benchPress)
    const b = await createRecord(db.exercises, benchPress)

    expect(a.id).not.toBe(b.id)
  })
})

describe('updateRecord', () => {
  it('altera os campos e renova o updatedAt, sem mexer no createdAt', async () => {
    // Só o Date é "falso" aqui; os timers reais continuam (o IndexedDB precisa deles).
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    const exercise = await createRecord(db.exercises, benchPress)

    vi.setSystemTime(new Date('2026-01-02T10:00:00Z'))
    await updateRecord(db.exercises, exercise.id, {
      names: { pt: 'Supino renomeado', en: 'Renamed bench' },
    })

    const updated = await db.exercises.get(exercise.id)
    expect(updated?.names.pt).toBe('Supino renomeado')
    expect(updated?.createdAt).toBe(exercise.createdAt)
    expect(updated?.updatedAt).toBeGreaterThan(exercise.updatedAt)
  })
})

describe('softDelete (exclusão lógica)', () => {
  it('marca deletedAt e mantém a linha no banco', async () => {
    const exercise = await createRecord(db.exercises, benchPress)

    await softDelete(db.exercises, exercise.id)

    const stored = await db.exercises.get(exercise.id)
    expect(stored).toBeDefined()
    expect(stored?.deletedAt).toBeTypeOf('number')
    expect(stored?.updatedAt).toBe(stored?.deletedAt)
    expect(isActive(stored as Exercise)).toBe(false)
  })

  it('remove o registro das listagens', async () => {
    const kept = await createRecord(db.exercises, benchPress)
    const removed = await createRecord(db.exercises, {
      ...benchPress,
      names: { pt: 'Removido', en: 'Removed' },
    })

    await softDelete(db.exercises, removed.id)

    const list = await listActiveExercises(db)
    expect(list.map((exercise) => exercise.id)).toEqual([kept.id])
  })

  it('falha com mensagem clara se o id não existe', async () => {
    await expect(softDelete(db.exercises, 'nao-existe')).rejects.toThrow(
      'Registro nao-existe não encontrado',
    )
  })
})

describe('syncSeedExercises', () => {
  it('insere os exercícios iniciais quando o banco está vazio', async () => {
    const inserted = await syncSeedExercises(db)

    expect(inserted).toBe(SEED_EXERCISES.length)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('rodar de novo não insere nada (tudo já existe)', async () => {
    await syncSeedExercises(db)

    expect(await syncSeedExercises(db)).toBe(0)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('num banco já em uso, adiciona só os exercícios novos', async () => {
    // Simula um aparelho com a versão antiga: só os 25 primeiros exercícios.
    const now = Date.now()
    await db.exercises.bulkAdd(
      SEED_EXERCISES.slice(0, 25).map((seed) => ({
        ...seed,
        isCustom: false,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })),
    )

    expect(await syncSeedExercises(db)).toBe(SEED_EXERCISES.length - 25)
    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('não duplica um exercício que já existe com o mesmo nome (ex.: do programa)', async () => {
    // Criado pelo import do programa, com outro id, mesmo nome (e outro acento/caixa).
    await createRecord(db.exercises, {
      names: { pt: 'remada CAVALINHO', en: 'T-Bar Row' },
      muscleGroup: 'back',
      equipment: 'barbell',
      isCustom: true,
    })

    await syncSeedExercises(db)

    const tBarRows = (await db.exercises.toArray()).filter(
      (exercise) => exercise.names.en === 'T-Bar Row',
    )
    expect(tBarRows).toHaveLength(1)
  })

  it('não duplica quando chamado duas vezes ao mesmo tempo', async () => {
    await Promise.all([syncSeedExercises(db), syncSeedExercises(db)])

    expect(await db.exercises.count()).toBe(SEED_EXERCISES.length)
  })

  it('não "ressuscita" exercícios do seed que o usuário excluiu', async () => {
    await syncSeedExercises(db)
    const all = await db.exercises.toArray()
    for (const exercise of all) {
      await softDelete(db.exercises, exercise.id)
    }

    expect(await syncSeedExercises(db)).toBe(0)
    expect(await listActiveExercises(db)).toEqual([])
  })

  it('cobre todos os grupos musculares, sem ids ou nomes repetidos', () => {
    const groups = new Set(SEED_EXERCISES.map((exercise) => exercise.muscleGroup))
    const ids = new Set(SEED_EXERCISES.map((exercise) => exercise.id))
    const namesPt = new Set(SEED_EXERCISES.map((exercise) => exercise.names.pt))
    const namesEn = new Set(SEED_EXERCISES.map((exercise) => exercise.names.en))

    expect([...groups].sort()).toEqual([...MUSCLE_GROUPS].sort())
    expect(ids.size).toBe(SEED_EXERCISES.length)
    expect(namesPt.size).toBe(SEED_EXERCISES.length)
    expect(namesEn.size).toBe(SEED_EXERCISES.length)
    for (const id of ids) {
      expect(id).toMatch(UUID_PATTERN)
    }
  })
})

describe('índices', () => {
  it('[exerciseId+completedAt] traz o histórico do exercício em ordem e ignora séries não concluídas', async () => {
    const exerciseId = crypto.randomUUID()
    const workoutId = crypto.randomUUID()
    const set = (position: number, completedAt: number | null) =>
      createRecord<SetEntry>(db.setEntries, {
        workoutId,
        exerciseId,
        position,
        weightKg: 100,
        reps: 5,
        type: 'normal',
        completedAt,
      })

    await set(0, 3000)
    await set(1, 1000)
    await set(2, null) // ainda não concluída

    const history = await db.setEntries
      .where('[exerciseId+completedAt]')
      .between([exerciseId, 0], [exerciseId, Infinity])
      .toArray()

    expect(history.map((entry) => entry.completedAt)).toEqual([1000, 3000])
  })
})

describe('versão do schema', () => {
  it('SCHEMA_VERSION acompanha a maior db.version(...) (o backup grava este número)', async () => {
    await db.open()
    // O Dexie guarda a versão do IndexedDB multiplicada por 10.
    expect(db.verno).toBe(SCHEMA_VERSION)
  })
})

describe('repository: escritas atômicas e desfazer', () => {
  it('duas atualizações seguidas no mesmo registro não perdem nenhuma', async () => {
    const created = await createRecord(db.exercises, { ...benchPress })

    await Promise.all([
      updateRecord(db.exercises, created.id, { equipment: 'machine' }),
      updateRecord(db.exercises, created.id, { muscleGroup: 'back' }),
    ])

    const saved = await db.exercises.get(created.id)
    expect(saved).toMatchObject({ equipment: 'machine', muscleGroup: 'back' })
  })

  it('restoreRecord desfaz o softDelete', async () => {
    const created = await createRecord(db.exercises, { ...benchPress })
    await softDelete(db.exercises, created.id)
    expect((await db.exercises.get(created.id))?.deletedAt).toBeTypeOf('number')

    await restoreRecord(db.exercises, created.id)

    expect((await db.exercises.get(created.id))?.deletedAt).toBeNull()
  })
})
