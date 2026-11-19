import {
  EQUIPMENT,
  LANGUAGES,
  LOADED_EQUIPMENT,
  MUSCLE_GROUPS,
  SETTINGS_ID,
  type BaseRecord,
  type LoadedEquipment,
} from '../../db/types'

/*
 * Validation of the rows of a backup file. The file comes from outside (it may be
 * old, hand-edited or from someone else) and goes straight into IndexedDB, so
 * each row is checked and COPIED field by field: unknown fields are
 * dropped and a field with the wrong type rejects the whole file. That way a
 * bad file never leaves broken data written (the app would freeze on every open).
 */

export const BACKUP_TABLES = [
  'exercises',
  'splits',
  'routines',
  'routineExercises',
  'workouts',
  'setEntries',
  'settings',
] as const
export type BackupTableName = (typeof BACKUP_TABLES)[number]

const MAX_TEXT_LENGTH = 5_000
const SET_TYPES = ['normal', 'encore', 'warmup'] as const

type Row = Record<string, unknown>

/** Invalid field: the caller turns it into a BackupError. */
class InvalidRow extends Error {}

function fail(): never {
  throw new InvalidRow()
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, options: { required?: boolean } = {}): string {
  if (typeof value === 'string' && value.length <= MAX_TEXT_LENGTH) {
    return value
  }
  // Optional field missing (file from an old version): empty text.
  if (value === undefined && !options.required) {
    return ''
  }
  return fail()
}

function id(value: unknown): string {
  const result = text(value, { required: true })
  return result === '' ? fail() : result
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fail()
}

/** Number or `null`; missing (field newer than the file) counts as `null`. */
function numOrNull(value: unknown): number | null {
  return value === undefined || value === null ? null : num(value)
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): T {
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : fail()
}

function base(row: Row): BaseRecord {
  return {
    id: id(row.id),
    createdAt: num(row.createdAt),
    updatedAt: num(row.updatedAt),
    deletedAt: row.deletedAt === null ? null : num(row.deletedAt),
  }
}

function sanitizers(row: Row): Record<BackupTableName, () => BaseRecord> {
  return {
    exercises: () => {
      if (!isRow(row.names)) {
        return fail()
      }
      return {
        ...base(row),
        names: {
          pt: text(row.names.pt, { required: true }),
          en: text(row.names.en, { required: true }),
        },
        muscleGroup: oneOf(row.muscleGroup, MUSCLE_GROUPS),
        equipment: oneOf(row.equipment, EQUIPMENT),
        isCustom: row.isCustom === true,
      } as BaseRecord
    },
    splits: () =>
      ({
        ...base(row),
        name: text(row.name, { required: true }),
        order: num(row.order),
        notes: text(row.notes),
      }) as BaseRecord,
    routines: () =>
      ({
        ...base(row),
        name: text(row.name, { required: true }),
        splitId: id(row.splitId),
        order: num(row.order),
        notes: text(row.notes),
      }) as BaseRecord,
    routineExercises: () =>
      ({
        ...base(row),
        routineId: id(row.routineId),
        exerciseId: id(row.exerciseId),
        position: num(row.position),
        targetSets: num(row.targetSets),
        targetRepsMin: num(row.targetRepsMin),
        targetRepsMax: num(row.targetRepsMax),
        referenceWeightKg: numOrNull(row.referenceWeightKg),
        referenceReps: numOrNull(row.referenceReps),
        notes: text(row.notes),
        restSeconds: numOrNull(row.restSeconds),
      }) as BaseRecord,
    workouts: () =>
      ({
        ...base(row),
        routineId: row.routineId === null ? null : id(row.routineId),
        startedAt: num(row.startedAt),
        endedAt: numOrNull(row.endedAt),
        timerStartedAt: numOrNull(row.timerStartedAt),
        timerStoppedAt: numOrNull(row.timerStoppedAt),
        timerPausedAt: numOrNull(row.timerPausedAt),
        notes: text(row.notes),
      }) as BaseRecord,
    setEntries: () =>
      ({
        ...base(row),
        workoutId: id(row.workoutId),
        exerciseId: id(row.exerciseId),
        position: num(row.position),
        weightKg: num(row.weightKg),
        reps: num(row.reps),
        type: oneOf(row.type, SET_TYPES),
        completedAt: numOrNull(row.completedAt),
      }) as BaseRecord,
    settings: () => settingsRow(row),
  }
}

/**
 * Settings: the record may come from an earlier version (without new fields).
 * Only present and valid fields come in; the app fills in missing ones with the default.
 */
function settingsRow(row: Row): BaseRecord {
  const record: Row = { ...base(row) }
  if (record.id !== SETTINGS_ID) {
    return fail()
  }
  if (row.language !== undefined) {
    record.language = oneOf(row.language, LANGUAGES)
  }
  if (row.restSeconds !== undefined) {
    record.restSeconds = num(row.restSeconds)
  }
  for (const key of ['autoStartRest', 'keepScreenOn', 'restSound'] as const) {
    if (row[key] !== undefined) {
      if (typeof row[key] !== 'boolean') {
        return fail()
      }
      record[key] = row[key]
    }
  }
  if (row.weightStepsKg !== undefined) {
    if (!isRow(row.weightStepsKg)) {
      return fail()
    }
    const steps: Partial<Record<LoadedEquipment, number>> = {}
    for (const equipment of LOADED_EQUIPMENT) {
      if (row.weightStepsKg[equipment] !== undefined) {
        const step = num(row.weightStepsKg[equipment])
        if (step <= 0) {
          return fail()
        }
        steps[equipment] = step
      }
    }
    record.weightStepsKg = steps
  }
  if (row.lastBackupAt !== undefined) {
    record.lastBackupAt = numOrNull(row.lastBackupAt)
  }
  if (row.activeSplitId !== undefined) {
    record.activeSplitId = row.activeSplitId === null ? null : id(row.activeSplitId)
  }
  return record as BaseRecord
}

/** Checks and copies a table row. Returns `null` if it is invalid. */
export function sanitizeRow(table: BackupTableName, row: unknown): BaseRecord | null {
  if (!isRow(row)) {
    return null
  }
  try {
    return sanitizers(row)[table]()
  } catch (error) {
    if (error instanceof InvalidRow) {
      return null
    }
    throw error
  }
}
