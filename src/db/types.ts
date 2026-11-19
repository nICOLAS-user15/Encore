/*
 * Types of the local database tables.
 *
 * Rules designed for future sync:
 * - `id` is a UUID generated on the device itself (does not depend on a server).
 * - Dates are numbers in milliseconds since 1970 (`Date.now()`): easy to
 *   compare, sort and index.
 * - Nothing is really deleted: `deletedAt` set = deleted record.
 *   That way another device can "find out" about the deletion when syncing.
 */

export type ID = string
/** Milliseconds since 1970-01-01 (the same as `Date.now()`). */
export type Timestamp = number

/** Fields every record has. */
export type BaseRecord = {
  id: ID
  createdAt: Timestamp
  updatedAt: Timestamp
  /** `null` = active record. Set = deleted (soft delete). */
  deletedAt: Timestamp | null
}

/** The "real" data of a record, without the automatic fields. */
export type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const
/** The names of each group on screen live in the dictionaries (src/i18n). */
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

/**
 * Equipment where the load goes up in steps (plates, dumbbells, machine stack).
 * Bodyweight is left out: there, progression is in repetitions.
 */
export const LOADED_EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'kettlebell',
] as const satisfies readonly Equipment[]
export type LoadedEquipment = (typeof LOADED_EQUIPMENT)[number]

export const LANGUAGES = ['pt', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** A text in each app language: `{ pt: 'Supino reto', en: 'Bench Press' }`. */
export type Translated = Record<Language, string>

export type Exercise = BaseRecord & {
  /** Name in each language. Exercises created by the user repeat the same name in both. */
  names: Translated
  muscleGroup: MuscleGroup
  equipment: Equipment
  /** `true` = created by the user; `false` = came from the seed. */
  isCustom: boolean
}

/**
 * Workout split: a group of routines that form a cycle (Upper/Lower, PPL,
 * ABC...). The Workout tab shows one split at a time.
 */
export type Split = BaseRecord & {
  name: string
  /** Position of the split in the tab list (0, 1, 2...). */
  order: number
  /** Notes (e.g. "4x per week, 90s rest"). */
  notes: string
}

export type Routine = BaseRecord & {
  name: string
  /** Split the routine belongs to. */
  splitId: ID
  /** Position of the routine in the list, within the split (0, 1, 2...). */
  order: number
  /** General notes (e.g. "Warm up well", "Stretch at the end"). */
  notes: string
}

/** Links an exercise to a routine, with the set target and the rep range. */
export type RoutineExercise = BaseRecord & {
  routineId: ID
  exerciseId: ID
  position: number
  targetSets: number
  /** Rep range: "6-10" becomes min 6, max 10. */
  targetRepsMin: number
  targetRepsMax: number
  /**
   * Reference load and reps, used to fill in the sets while
   * there is no history for this exercise yet. `null` = no reference.
   */
  referenceWeightKg: number | null
  referenceReps: number | null
  /** Exercise note (e.g. "load per side"). */
  notes: string
  /**
   * Rest for this exercise, in seconds. `null` = uses the default from Settings.
   * Items saved before this field existed do not have it: read with `restSecondsOf`.
   */
  restSeconds: number | null
}

export type Workout = BaseRecord & {
  /** Routine used as a base, or `null` for a free workout. */
  routineId: ID | null
  /** When the workout was opened (workout date in the history). */
  startedAt: Timestamp
  /** `null` while the workout is in progress. */
  endedAt: Timestamp | null
  /**
   * User-controlled timer, separate from when the workout was opened
   * (you can do mobility work before starting to count).
   * `null` = not started yet / not stopped yet.
   */
  timerStartedAt: Timestamp | null
  timerStoppedAt: Timestamp | null
  /**
   * When the timer was paused (e.g. going to the bathroom); `null`/absent = not
   * paused. On resume, `timerStartedAt` advances by the pause time, so stopped
   * time never enters the duration. Optional: old workouts do not have the field
   * (no index, no migration).
   */
  timerPausedAt?: Timestamp | null
  notes: string
}

/** Fixed id of the single settings record. */
export const SETTINGS_ID = 'app-settings'

/** User preferences (a single record, with a fixed id). */
export type Settings = BaseRecord & {
  language: Language
  /** Default rest duration, in seconds. */
  restSeconds: number
  /** Whether rest starts on its own when a set is completed. */
  autoStartRest: boolean
  /** Keep the screen on while a workout is in progress. */
  keepScreenOn: boolean
  /** Play a beep when rest ends. */
  restSound: boolean
  /**
   * Smallest load step for each equipment at the user's gym (kg).
   * Used in the progression suggestion and in the −/+ buttons of the set editor.
   */
  weightStepsKg: Record<LoadedEquipment, number>
  /** When the last backup was exported on this device (`null` = never). */
  lastBackupAt: Timestamp | null
  /** Split chosen in the Workout and Routines tabs (`null` = the first). */
  activeSplitId: ID | null
}

/**
 * - `normal`: planned set.
 * - `encore`: extra set ("bis"), done beyond the plan.
 * - `warmup`: warm-up. Does not count toward volume, "last time" or records.
 */
export type SetType = 'normal' | 'encore' | 'warmup'

export type SetEntry = BaseRecord & {
  workoutId: ID
  exerciseId: ID
  position: number
  /** Always in kg. Conversion to lb happens only at display time. */
  weightKg: number
  reps: number
  type: SetType
  /** `null` = set not completed yet. */
  completedAt: Timestamp | null
}
