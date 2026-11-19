import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import { SETTINGS_ID, type Settings } from '../../db/types'
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  weightStepFor,
} from './settingsRepository'

let db: EncoreDB

beforeEach(() => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  await db.delete()
})

describe('saltos de carga nas configurações', () => {
  it('configurações salvas antes do campo existir recebem os saltos padrão', async () => {
    // Registro como estava no celular antes desta versão (sem weightStepsKg).
    await db.settings.put({
      id: SETTINGS_ID,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      language: 'pt',
      restSeconds: 120,
      autoStartRest: true,
      keepScreenOn: true,
      restSound: false,
      // O tipo atual exige weightStepsKg; o "as unknown as" simula o registro antigo.
    } as unknown as Settings)

    const settings = await getSettings(db)

    expect(settings.restSeconds).toBe(120) // o que o usuário escolheu continua
    expect(settings.weightStepsKg).toEqual(DEFAULT_SETTINGS.weightStepsKg)
  })

  it('trocar o salto de um equipamento mantém os outros', async () => {
    const before = await getSettings(db)
    await updateSettings(db, { weightStepsKg: { ...before.weightStepsKg, dumbbell: 1 } })

    const after = await getSettings(db)

    expect(after.weightStepsKg).toEqual({
      ...DEFAULT_SETTINGS.weightStepsKg,
      dumbbell: 1,
    })
  })

  it('cada equipamento usa o seu salto; peso corporal anda de 2,5 em 2,5', () => {
    expect(weightStepFor(DEFAULT_SETTINGS, 'barbell')).toBe(2.5)
    expect(weightStepFor(DEFAULT_SETTINGS, 'dumbbell')).toBe(2)
    expect(weightStepFor(DEFAULT_SETTINGS, 'machine')).toBe(5)
    expect(weightStepFor(DEFAULT_SETTINGS, 'bodyweight')).toBe(2.5)
  })
})
