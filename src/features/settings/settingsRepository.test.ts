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

describe('load steps in settings', () => {
  it('settings saved before the field existed get the default steps', async () => {
    // Record as it was on the phone before this version (without weightStepsKg).
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
      // The current type requires weightStepsKg; the "as unknown as" simulates the old record.
    } as unknown as Settings)

    const settings = await getSettings(db)

    expect(settings.restSeconds).toBe(120) // what the user chose stays
    expect(settings.weightStepsKg).toEqual(DEFAULT_SETTINGS.weightStepsKg)
    // Same for the weekly goal (added later): automatic.
    expect(settings.weeklyGoal).toBeNull()
    // And the plate calculator (added after v4): Olympic bar and the default plates.
    expect(settings.barWeightKg).toBe(20)
    expect(settings.platesKg).toEqual(DEFAULT_SETTINGS.platesKg)
  })

  it('saves the weekly goal', async () => {
    await updateSettings(db, { weeklyGoal: 5 })

    expect((await getSettings(db)).weeklyGoal).toBe(5)
  })

  it('changing the step of one equipment keeps the others', async () => {
    const before = await getSettings(db)
    await updateSettings(db, { weightStepsKg: { ...before.weightStepsKg, dumbbell: 1 } })

    const after = await getSettings(db)

    expect(after.weightStepsKg).toEqual({
      ...DEFAULT_SETTINGS.weightStepsKg,
      dumbbell: 1,
    })
  })

  it('each equipment uses its own step; bodyweight moves in 2.5 steps', () => {
    expect(weightStepFor(DEFAULT_SETTINGS, 'barbell')).toBe(2.5)
    expect(weightStepFor(DEFAULT_SETTINGS, 'dumbbell')).toBe(2)
    expect(weightStepFor(DEFAULT_SETTINGS, 'machine')).toBe(5)
    expect(weightStepFor(DEFAULT_SETTINGS, 'bodyweight')).toBe(2.5)
  })
})
