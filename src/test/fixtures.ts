import type { EncoreDB } from '../db/db'
import { createRecord, isActive } from '../db/repository'
import {
  LANGUAGES,
  type Equipment,
  type ID,
  type MuscleGroup,
  type Translated,
} from '../db/types'

/*
 * EXAMPLE data for the tests: a split with four routines.
 *
 * This is NOT part of the app and never goes to the user's browser (only tests
 * import this file). The loads and repetitions are generic example values. The app itself
 * starts with no split and no routines: whoever uses it creates their own.
 */

type FixtureItem = {
  names: Translated
  muscleGroup: MuscleGroup
  equipment: Equipment
  sets: number
  /** Reference load and reps; `null` = no data. */
  weightKg: number | null
  reps: number | null
  notes?: string
}

type FixtureRoutine = { name: string; notes: string; exercises: FixtureItem[] }

/** Shortcut: 6–10 rep range on all example items. */
function item(
  pt: string,
  en: string,
  muscleGroup: MuscleGroup,
  equipment: Equipment,
  sets: number,
  weightKg: number | null,
  reps: number | null,
  notes?: string,
): FixtureItem {
  return { names: { pt, en }, muscleGroup, equipment, sets, weightKg, reps, notes }
}

export const TEST_SPLIT_NAME = 'Upper / Lower'

export const TEST_ROUTINES: FixtureRoutine[] = [
  {
    name: 'Upper A',
    notes: 'Cardio 15 min no final.',
    exercises: [
      item('Supino reto com barra', 'Bench Press', 'chest', 'barbell', 3, 25, 8),
      item('Puxada frontal', 'Lat Pulldown', 'back', 'cable', 3, 40, 10),
      item(
        'Crucifixo na máquina (peck deck)',
        'Fly Machine',
        'chest',
        'machine',
        2,
        30,
        8,
      ),
      item(
        'Remada unilateral (lombar)',
        'Unilateral Rows (lower back)',
        'back',
        'dumbbell',
        2,
        20,
        10,
        'Carga por lado.',
      ),
      item(
        'Elevação lateral',
        'Lateral Raises (dumbbells)',
        'shoulders',
        'dumbbell',
        2,
        8,
        10,
      ),
      // No reference repetitions: the workout uses the minimum of the range.
      item(
        'Rosca Scott na máquina',
        'Scott Curl Machine',
        'biceps',
        'machine',
        2,
        15,
        null,
      ),
      item('Tríceps na polia', 'Cable Triceps Pushdown', 'triceps', 'cable', 2, 20, 10),
    ],
  },
  {
    name: 'Lower A',
    notes: 'Mobilidade antes de começar.',
    exercises: [
      item('Agachamento livre', 'Squats', 'quads', 'barbell', 3, 40, 8),
      item('Cadeira extensora', 'Leg Extensions', 'quads', 'machine', 2, 30, 10),
      item('Mesa flexora', 'Leg Curl Machine', 'hamstrings', 'machine', 2, 25, 10),
      item('Panturrilha em pé', 'Calf Raises (standing)', 'calves', 'machine', 2, 30, 12),
    ],
  },
  {
    name: 'Upper B',
    notes: '',
    exercises: [
      item(
        'Supino inclinado com halteres',
        'Incline Dumbbell Bench Press',
        'chest',
        'dumbbell',
        3,
        16,
        8,
      ),
      item('Remada cavalinho', 'T-Bar Row', 'back', 'barbell', 2, 30, 8),
      item('Rosca no banco 45°', 'Curls 45°', 'biceps', 'dumbbell', 2, 10, 10),
    ],
  },
  {
    name: 'Lower B',
    notes: '',
    exercises: [
      item('Leg press unilateral', 'Unilateral Leg Press', 'quads', 'machine', 2, 40, 10),
      item(
        'Terra romeno com halteres',
        'RDL (dumbbells)',
        'hamstrings',
        'dumbbell',
        2,
        20,
        10,
      ),
      item('Panturrilha sentado', 'Calf Raises (seated)', 'calves', 'machine', 2, 20, 12),
    ],
  },
]

/** Comparable name: case-insensitive and ignoring spaces at the ends. */
function key(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR')
}

/**
 * Creates in the database the example split with the four routines (6–10 rep range).
 * Reuses exercises that already exist with the same name, in any language;
 * the missing ones are created as custom exercises.
 * Returns how many routines were created.
 */
export async function importTestProgram(db: EncoreDB): Promise<number> {
  return db.transaction(
    'rw',
    [db.exercises, db.splits, db.routines, db.routineExercises],
    async () => {
      const idByName = new Map<string, ID>()
      for (const exercise of await db.exercises.filter(isActive).toArray()) {
        for (const language of LANGUAGES) {
          idByName.set(key(exercise.names[language]), exercise.id)
        }
      }

      const splits = await db.splits.filter(isActive).toArray()
      const split = await createRecord(db.splits, {
        name: TEST_SPLIT_NAME,
        notes: '',
        order: Math.max(-1, ...splits.map((existing) => existing.order)) + 1,
      })

      for (const [order, template] of TEST_ROUTINES.entries()) {
        const routine = await createRecord(db.routines, {
          name: template.name,
          splitId: split.id,
          notes: template.notes,
          order,
        })

        for (const [position, exercise] of template.exercises.entries()) {
          const keys = LANGUAGES.map((language) => key(exercise.names[language]))
          let exerciseId = keys.map((name) => idByName.get(name)).find(Boolean)
          if (exerciseId === undefined) {
            const created = await createRecord(db.exercises, {
              names: exercise.names,
              muscleGroup: exercise.muscleGroup,
              equipment: exercise.equipment,
              isCustom: true,
            })
            exerciseId = created.id
            for (const name of keys) {
              idByName.set(name, exerciseId)
            }
          }

          await createRecord(db.routineExercises, {
            routineId: routine.id,
            exerciseId,
            position,
            targetSets: exercise.sets,
            targetRepsMin: 6,
            targetRepsMax: 10,
            referenceWeightKg: exercise.weightKg,
            referenceReps: exercise.reps,
            notes: exercise.notes ?? '',
            restSeconds: null,
          })
        }
      }
      return TEST_ROUTINES.length
    },
  )
}
