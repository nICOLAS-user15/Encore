import Dexie, { type Table } from 'dexie'
import { upgradeToV2 } from './migrations/v2'
import { upgradeToV3 } from './migrations/v3'
import type {
  BodyWeight,
  Exercise,
  ID,
  Routine,
  RoutineExercise,
  SetEntry,
  Settings,
  Split,
  Workout,
} from './types'

/**
 * The database with typed tables. `Table<T, ID>` (not `EntityTable`) because the id
 * is always our own UUID, required at insert time (it is not auto-increment).
 */
export type EncoreDB = Dexie & {
  exercises: Table<Exercise, ID>
  splits: Table<Split, ID>
  routines: Table<Routine, ID>
  routineExercises: Table<RoutineExercise, ID>
  workouts: Table<Workout, ID>
  setEntries: Table<SetEntry, ID>
  settings: Table<Settings, ID>
  bodyWeights: Table<BodyWeight, ID>
}

/**
 * Version 1 schema. Exported because the migration test needs
 * to create an "old" database to migrate.
 *
 * How to read: the first item is the primary key; the others are indexes.
 * `[a+b]` is a compound index. Only fields used in queries/sorting become indexes.
 */
export const SCHEMA_V1 = {
  exercises: 'id, name, muscleGroup, updatedAt',
  routines: 'id, order, updatedAt',
  // Exercises of a routine, already in the right order.
  routineExercises: 'id, [routineId+position], exerciseId, updatedAt',
  // Workout history from newest to oldest.
  workouts: 'id, startedAt, routineId, updatedAt',
  // [workoutId+position]: the sets of a workout, in order.
  // [exerciseId+completedAt]: history of an exercise over time
  // (sets with completedAt = null are left out of this index).
  setEntries: 'id, [workoutId+position], [exerciseId+completedAt], updatedAt',
}

/** Current schema version (the highest `db.version(...)` below). The backup records this number. */
export const SCHEMA_VERSION = 4

/**
 * Creates (or opens) the database. Takes the name so tests can use
 * a separate, disposable database.
 *
 * Versions: each change to INDEXES or tables creates a new version, and the
 * old ones are never edited (the user's device may be on any one of
 * them). Plain fields, without an index, do not count as schema for Dexie.
 */
export function createDatabase(name: string): EncoreDB {
  const db = new Dexie(name) as EncoreDB

  db.version(1).stores(SCHEMA_V1)

  // v2: bilingual names (the `name` index goes away: sorting now depends on the
  // language and is done in memory), settings table and timer.
  db.version(2)
    .stores({
      exercises: 'id, muscleGroup, updatedAt',
      settings: 'id, updatedAt',
    })
    .upgrade(upgradeToV2)

  // v3: workout splits (Upper/Lower, PPL...). New table; routines get
  // `splitId` (plain field, no index) and the migration organizes the existing ones.
  db.version(3)
    .stores({
      splits: 'id, order, updatedAt',
    })
    .upgrade(upgradeToV3)

  // v4: body weight log (new table, ordered by date). Nothing existing changes, so there
  // is no upgrade function: Dexie creates the empty table (migrations/v4.test.ts proves
  // that a v3 database keeps everything).
  db.version(4).stores({
    bodyWeights: 'id, measuredAt, updatedAt',
  })

  // `updatedAt` appears in every table so future sync
  // can ask "what changed since last time?".

  return db
}

/** Single instance used by the app. */
export const db = createDatabase('encore')
