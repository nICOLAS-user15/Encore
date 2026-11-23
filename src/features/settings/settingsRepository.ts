import type { EncoreDB } from '../../db/db'
import { SETTINGS_ID, type Equipment, type Settings } from '../../db/types'

/** The preferences themselves (without the record's automatic fields). */
export type AppSettings = Pick<
  Settings,
  | 'language'
  | 'restSeconds'
  | 'autoStartRest'
  | 'keepScreenOn'
  | 'restSound'
  | 'weightStepsKg'
  | 'lastBackupAt'
  | 'activeSplitId'
  | 'weeklyGoal'
>

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'pt',
  restSeconds: 90,
  autoStartRest: true,
  keepScreenOn: true,
  restSound: true,
  // Common steps in Brazilian gyms: 1.25 kg plates per side (2.5 on the
  // bar), dumbbells in 2 kg steps, machine stacks in 5 kg steps, kettlebells in 4 kg steps.
  weightStepsKg: {
    barbell: 2.5,
    dumbbell: 2,
    machine: 5,
    cable: 5,
    kettlebell: 4,
  },
  lastBackupAt: null,
  activeSplitId: null,
  // Automatic: one workout per routine of the chosen split (Upper/Lower with 4 = 4 a week).
  weeklyGoal: null,
}

/** Rest duration options offered on the Settings screen (seconds). */
export const REST_OPTIONS = [60, 90, 120, 180] as const

/** Weekly goal options offered in Settings (workouts per week). */
export const WEEKLY_GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const

/** Load step options offered in Settings (kg). */
export const WEIGHT_STEP_OPTIONS = [1, 1.25, 2, 2.5, 4, 5] as const

/** Bodyweight with extra load (belt, vest): the editor's −/+ moves in 2.5 kg steps. */
export const BODYWEIGHT_STEP_KG = 2.5

/** Step of the load −/+ buttons for an equipment. */
export function weightStepFor(settings: AppSettings, equipment: Equipment): number {
  return equipment === 'bodyweight'
    ? BODYWEIGHT_STEP_KG
    : settings.weightStepsKg[equipment]
}

/** Saved settings, or the defaults if the user never changed anything. */
export async function getSettings(db: EncoreDB): Promise<AppSettings> {
  const row = await db.settings.get(SETTINGS_ID)
  if (!row) {
    return DEFAULT_SETTINGS
  }
  // `??`: records saved before a field existed do not have that field;
  // in that case the default applies (no migration needed).
  return {
    language: row.language ?? DEFAULT_SETTINGS.language,
    restSeconds: row.restSeconds ?? DEFAULT_SETTINGS.restSeconds,
    autoStartRest: row.autoStartRest ?? DEFAULT_SETTINGS.autoStartRest,
    keepScreenOn: row.keepScreenOn ?? DEFAULT_SETTINGS.keepScreenOn,
    restSound: row.restSound ?? DEFAULT_SETTINGS.restSound,
    // Object: merges the default with the saved one, so a new equipment also has a value.
    weightStepsKg: { ...DEFAULT_SETTINGS.weightStepsKg, ...row.weightStepsKg },
    lastBackupAt: row.lastBackupAt ?? null,
    activeSplitId: row.activeSplitId ?? null,
    weeklyGoal: row.weeklyGoal ?? DEFAULT_SETTINGS.weeklyGoal,
  }
}

/**
 * Saves one or more preferences.
 * Exception to the "every write goes through repository.ts" rule: settings are
 * a single record with a FIXED id (not a new UUID), so they are written here.
 */
export async function updateSettings(
  db: EncoreDB,
  changes: Partial<AppSettings>,
): Promise<void> {
  await db.transaction('rw', db.settings, async () => {
    const existing = await db.settings.get(SETTINGS_ID)
    const now = Date.now()
    await db.settings.put({
      ...DEFAULT_SETTINGS,
      ...existing,
      ...changes,
      id: SETTINGS_ID,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    })
  })
}
