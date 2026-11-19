import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import { listActiveExercises } from '../../db/queries'
import { softDelete } from '../../db/repository'
import { syncSeedExercises } from '../../db/seed'
import { createCustomExercise, findExerciseByName } from './exerciseActions'

let db: EncoreDB

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await syncSeedExercises(db)
})

afterEach(async () => {
  await db.delete()
})

describe('createCustomExercise', () => {
  it('cria o exercício na biblioteca, marcado como do usuário, com o nome nos dois idiomas', async () => {
    const before = await db.exercises.count()

    const created = await createCustomExercise(db, {
      name: '  Remada  articulada ',
      muscleGroup: 'back',
      equipment: 'machine',
    })

    expect(created).toMatchObject({
      names: { pt: 'Remada articulada', en: 'Remada articulada' },
      muscleGroup: 'back',
      equipment: 'machine',
      isCustom: true,
      deletedAt: null,
    })
    expect(await db.exercises.count()).toBe(before + 1)
    // Aparece na biblioteca (a lista que a aba Exercícios usa), nos dois idiomas.
    expect((await listActiveExercises(db, 'pt')).map((e) => e.id)).toContain(created.id)
    expect((await listActiveExercises(db, 'en')).map((e) => e.id)).toContain(created.id)
  })

  it('não duplica: um nome que já existe devolve o exercício existente', async () => {
    const before = await db.exercises.count()

    // Maiúsculas, acento e idioma diferentes do cadastro "Supino reto com barra" / "Bench Press".
    const byPortuguese = await createCustomExercise(db, {
      name: 'SUPINO reto com BARRA',
      muscleGroup: 'chest',
      equipment: 'barbell',
    })
    const byEnglish = await createCustomExercise(db, {
      name: 'bench press',
      muscleGroup: 'chest',
      equipment: 'barbell',
    })

    expect(byPortuguese.id).toBe(byEnglish.id)
    expect(byPortuguese.isCustom).toBe(false) // é o do seed, intacto
    expect(await db.exercises.count()).toBe(before)
  })

  it('criar duas vezes o mesmo nome novo não gera repetido', async () => {
    const input = {
      name: 'Meu exercício',
      muscleGroup: 'core',
      equipment: 'cable',
    } as const

    const [a, b] = await Promise.all([
      createCustomExercise(db, input),
      createCustomExercise(db, input),
    ])

    expect(a.id).toBe(b.id)
    expect((await db.exercises.filter((e) => e.isCustom).toArray()).length).toBe(1)
  })

  it('um exercício excluído da biblioteca não conta: o nome pode ser criado de novo', async () => {
    const created = await createCustomExercise(db, {
      name: 'Exercício antigo',
      muscleGroup: 'core',
      equipment: 'bodyweight',
    })
    await softDelete(db.exercises, created.id)

    const again = await createCustomExercise(db, {
      name: 'Exercício antigo',
      muscleGroup: 'core',
      equipment: 'bodyweight',
    })

    expect(again.id).not.toBe(created.id)
  })
})

describe('findExerciseByName', () => {
  it('acha por qualquer idioma, ignorando acentos e maiúsculas', async () => {
    expect((await findExerciseByName(db, 'tríceps NA polia'))?.names.pt).toBe(
      'Tríceps na polia',
    )
    expect((await findExerciseByName(db, 'cable triceps pushdown'))?.names.en).toBe(
      'Cable Triceps Pushdown',
    )
    expect(await findExerciseByName(db, 'não existe esse')).toBeUndefined()
  })
})
