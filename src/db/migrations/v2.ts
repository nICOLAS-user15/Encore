import type { Transaction } from 'dexie'
import { SEED_EXERCISES_V1 } from '../seed'
import type { ID, Translated } from '../types'

/*
 * Migration of the database from version 1 to 2. Runs ONCE, on its own, on the first
 * app open after the update (Dexie takes care of it), inside a
 * transaction: either everything works, or nothing changes.
 *
 * What changes:
 * 1. Exercises: `name` (text) becomes `names` ({ pt, en }).
 * 2. Duplicate exercises are merged. E.g. "Bench Press" (created by a ready-made
 *    program) and "Supino reto com barra" (from the seed) were two records of the
 *    same exercise. The sets and routines of the duplicate now point to the
 *    seed one, and the duplicate is deleted (soft delete). No set is lost.
 * 3. Workouts get the timer fields (`timerStartedAt`/`timerStoppedAt`),
 *    filled with the start/end the workout already had.
 */

/** Shape of an exercise in version 1 (only what the migration needs). */
type LegacyExercise = {
  id: ID
  name?: string
  names?: Translated
  isCustom: boolean
  deletedAt: number | null
  updatedAt: number
}

type WithExerciseId = { exerciseId: ID; updatedAt: number }

type LegacyWorkout = {
  startedAt: number
  endedAt: number | null
  timerStartedAt?: number | null
  timerStoppedAt?: number | null
}

function normalize(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR')
}

/*
 * Only the ORIGINAL seed list (the one that existed in version 1): a migration uses the
 * data from the moment it was written. With the current list, exercises from the
 * program would be "merged" with exercises that do not even exist in a v1 database.
 */
/** Seed names by id. */
const seedNamesById = new Map(SEED_EXERCISES_V1.map((seed) => [seed.id, seed.names]))
/** Seed id by English name (which is the same name used in the program). */
const seedIdByEnglishName = new Map(
  SEED_EXERCISES_V1.map((seed) => [normalize(seed.names.en), seed.id]),
)
/**
 * Portuguese translation of exercises the old app created from a
 * ready-made program (names only, English -> Portuguese). Frozen list: used
 * only for version 1 databases.
 */
const LEGACY_PROGRAM_NAMES: Array<[en: string, pt: string]> = [
  ['Abs Machine', 'Abdominal na máquina'],
  ['Back Extensions', 'Hiperextensão lombar'],
  ['Bench Press', 'Supino reto com barra'],
  ['Cable Lateral Raises', 'Elevação lateral na polia'],
  ['Cable Triceps Pushdown', 'Tríceps na polia'],
  ['Calf Raises (seated)', 'Panturrilha sentado'],
  ['Calf Raises (standing)', 'Panturrilha em pé'],
  ['Curls 45°', 'Rosca no banco 45°'],
  ['Fly Machine', 'Crucifixo na máquina (peck deck)'],
  ['French Triceps (rope)', 'Tríceps francês na corda'],
  ['Incline Dumbbell Bench Press', 'Supino inclinado com halteres'],
  ['Lat Pulldown', 'Puxada frontal'],
  ['Lateral Raises (dumbbells)', 'Elevação lateral'],
  ['Leg Curl Machine', 'Mesa flexora'],
  ['Leg Extensions', 'Cadeira extensora'],
  ['Pendulum / Hack Squat', 'Agachamento pêndulo / hack'],
  ['RDL (dumbbells)', 'Terra romeno com halteres'],
  ['Scott Curl Machine', 'Rosca Scott na máquina'],
  ['Squats', 'Agachamento livre'],
  ['T-Bar Row', 'Remada cavalinho'],
  ['Triangle Lat Pulldown', 'Puxada com triângulo'],
  ['Unilateral Leg Press', 'Leg press unilateral'],
  ['Unilateral Rows (lower back)', 'Remada unilateral (lombar)'],
]
const programNamesByEnglish = new Map(
  LEGACY_PROGRAM_NAMES.map(([en, pt]) => [normalize(en), { pt, en }] as const),
)

export async function upgradeToV2(tx: Transaction): Promise<void> {
  const now = Date.now()
  /** id of the duplicate -> id of the seed exercise that stays. */
  const mergeInto = new Map<ID, ID>()

  // 1 and 2: translated names + mark duplicates.
  await tx
    .table<LegacyExercise>('exercises')
    .toCollection()
    .modify((exercise) => {
      const oldName = exercise.name ?? ''
      const key = normalize(oldName)
      const seedTarget = seedIdByEnglishName.get(key)

      if (seedNamesById.has(exercise.id)) {
        exercise.names = seedNamesById.get(exercise.id)
      } else if (exercise.isCustom && seedTarget !== undefined) {
        // Duplicate of a seed exercise: disappears from the list, history goes to the seed.
        mergeInto.set(exercise.id, seedTarget)
        exercise.names = { pt: oldName, en: oldName }
        exercise.deletedAt = exercise.deletedAt ?? now
      } else {
        exercise.names = programNamesByEnglish.get(key) ?? { pt: oldName, en: oldName }
      }

      delete exercise.name
      exercise.updatedAt = now
    })

  // 2: sets and routines of the duplicate now point to the seed exercise.
  if (mergeInto.size > 0) {
    for (const tableName of ['routineExercises', 'setEntries']) {
      await tx
        .table<WithExerciseId>(tableName)
        .toCollection()
        .modify((row) => {
          const target = mergeInto.get(row.exerciseId)
          if (target !== undefined) {
            row.exerciseId = target
            row.updatedAt = now
          }
        })
    }
  }

  // 3: timer of the workouts that already existed.
  await tx
    .table<LegacyWorkout>('workouts')
    .toCollection()
    .modify((workout) => {
      workout.timerStartedAt = workout.startedAt
      workout.timerStoppedAt = workout.endedAt
    })
}
