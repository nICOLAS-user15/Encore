import type {
  ID,
  Routine,
  RoutineExercise,
  SetEntry,
  Split,
  Workout,
} from '../src/db/types'

/*
 * A FICTITIOUS training history for the README screenshots: eight weeks of a
 * Push/Pull/Legs split (Monday, Wednesday, Friday) with steady progression, and a
 * Legs workout in progress "today". It is built as an Encore backup file, so the
 * screenshots spec loads it through the real Import button.
 *
 * Exercises come from the built-in library by their fixed seed ids (src/db/seed.ts),
 * so the file needs no exercise rows.
 */

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** Time zone of the screenshots: the dates below are written for it. */
export const SHOWCASE_TIMEZONE = 'America/Sao_Paulo'
/** "Now" in the screenshots: Thursday, 19 Nov 2026, 19:00 in São Paulo (UTC-3). */
export const SHOWCASE_NOW = Date.UTC(2026, 10, 19, 22, 0)
/** Monday of that week, 18:30 local: the usual training time. */
const THIS_MONDAY_EVENING = Date.UTC(2026, 10, 16, 21, 30)
const WEEKS = 8

type PlanItem = {
  exerciseId: ID
  sets: number
  repsMin: number
  repsMax: number
  /** Load in the first session, and how much it grows. 0/0 = bodyweight. */
  baseKg: number
  stepKg: number
  /** One warm-up set before the working sets (the main lift of the day). */
  warmup?: boolean
}

const ROUTINES: { name: string; plan: PlanItem[] }[] = [
  {
    name: 'Push',
    plan: [
      // Bench Press
      {
        exerciseId: 'd583a392-b227-4970-a6ff-07c929916fd3',
        sets: 4,
        repsMin: 6,
        repsMax: 10,
        baseKg: 60,
        stepKg: 2.5,
        warmup: true,
      },
      // Overhead Press
      {
        exerciseId: 'b238da7f-84bd-4597-8ae5-ef944327ade3',
        sets: 3,
        repsMin: 6,
        repsMax: 10,
        baseKg: 35,
        stepKg: 2.5,
      },
      // Incline Dumbbell Bench Press
      {
        exerciseId: 'a622af38-a710-488e-b39e-8c595b5b3a3e',
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        baseKg: 20,
        stepKg: 2,
      },
      // Lateral Raises (dumbbells)
      {
        exerciseId: '0a83f5f4-4394-41e2-9b53-70808a35693e',
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        baseKg: 8,
        stepKg: 1,
      },
      // Cable Triceps Pushdown
      {
        exerciseId: '582071f6-194d-48c9-b94e-444f69374975',
        sets: 3,
        repsMin: 10,
        repsMax: 15,
        baseKg: 25,
        stepKg: 2.5,
      },
    ],
  },
  {
    name: 'Pull',
    plan: [
      // Barbell Row
      {
        exerciseId: '5288f16c-a4e3-4624-92c7-af4a86a9106e',
        sets: 4,
        repsMin: 6,
        repsMax: 10,
        baseKg: 55,
        stepKg: 2.5,
        warmup: true,
      },
      // Lat Pulldown
      {
        exerciseId: '5cddea39-1d2a-4db6-8948-c7cbb9ce5b0f',
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        baseKg: 50,
        stepKg: 5,
      },
      // Pull-up (bodyweight)
      {
        exerciseId: '5767b536-3667-4f49-87b6-c6e82876c3e8',
        sets: 3,
        repsMin: 6,
        repsMax: 10,
        baseKg: 0,
        stepKg: 0,
      },
      // Barbell Curl
      {
        exerciseId: 'b49b53af-e001-4e85-a981-78184eb3ff35',
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        baseKg: 25,
        stepKg: 2.5,
      },
      // Face Pull
      {
        exerciseId: '2a7daf92-b906-46fc-994f-bfab5ac6e8cd',
        sets: 3,
        repsMin: 12,
        repsMax: 15,
        baseKg: 20,
        stepKg: 2.5,
      },
    ],
  },
  {
    name: 'Legs',
    plan: [
      // Squats
      {
        exerciseId: 'd83ca170-a96a-4895-b7ee-9f9957f035d2',
        sets: 4,
        repsMin: 5,
        repsMax: 8,
        baseKg: 80,
        stepKg: 5,
        warmup: true,
      },
      // Stiff-Leg Deadlift
      {
        exerciseId: '9da25964-9985-4b1b-8a84-855fd55f1a08',
        sets: 3,
        repsMin: 8,
        repsMax: 12,
        baseKg: 70,
        stepKg: 5,
      },
      // Leg Press 45°
      {
        exerciseId: '0f4b184d-9b1c-4a8a-8d0a-11bf5c0ac5b4',
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        baseKg: 160,
        stepKg: 10,
      },
      // Leg Curl Machine
      {
        exerciseId: '1b6f3b32-0bce-4d37-86ec-8fef101845c7',
        sets: 3,
        repsMin: 10,
        repsMax: 12,
        baseKg: 40,
        stepKg: 5,
      },
      // Calf Raises (standing)
      {
        exerciseId: '76852518-5cd5-4585-9079-8e06cdc47e3c',
        sets: 4,
        repsMin: 12,
        repsMax: 15,
        baseKg: 60,
        stepKg: 5,
      },
    ],
  },
]

/**
 * The planned set for the k-th session of an exercise: the load goes up every other
 * session and the reps dip right after each jump, like real double progression.
 */
function plannedSet(item: PlanItem, k: number): { weightKg: number; reps: number } {
  if (item.stepKg === 0) {
    return { weightKg: 0, reps: Math.min(item.repsMax, item.repsMin + Math.ceil(k / 2)) }
  }
  return {
    weightKg: item.baseKg + item.stepKg * Math.ceil(k / 2),
    reps: Math.min(item.repsMax, item.repsMin + (k % 2 === 1 ? 2 : 3)),
  }
}

type Row = Split | Routine | RoutineExercise | Workout | SetEntry

function record<T extends Row>(
  createdAt: number,
  fields: Omit<T, keyof Row> & Partial<T>,
) {
  return {
    id: crypto.randomUUID(),
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    ...fields,
  } as T
}

/**
 * Builds the backup file. `completedInProgress` = how many sets of today's workout
 * are already done (warm-up included).
 */
export function buildShowcaseBackup(completedInProgress = 9) {
  const firstDay = THIS_MONDAY_EVENING - (WEEKS - 1) * 7 * DAY
  const createdAt = firstDay - DAY

  const split = record<Split>(createdAt, { name: 'Push Pull Legs', order: 0, notes: '' })
  const routines = ROUTINES.map((routine, order) =>
    record<Routine>(createdAt, {
      name: routine.name,
      splitId: split.id,
      order,
      notes: '',
    }),
  )
  const routineExercises = ROUTINES.flatMap((routine, r) =>
    routine.plan.map((item, position) =>
      record<RoutineExercise>(createdAt, {
        routineId: routines[r].id,
        exerciseId: item.exerciseId,
        position,
        targetSets: item.sets,
        targetRepsMin: item.repsMin,
        targetRepsMax: item.repsMax,
        referenceWeightKg: null,
        referenceReps: null,
        notes: '',
        restSeconds: item.warmup ? 150 : null,
      }),
    ),
  )

  // Monday, Wednesday and Friday of every week, up to this Wednesday; today is a Thursday.
  const days: number[] = []
  for (let week = 0; week < WEEKS; week++) {
    for (const offset of [0, 2, 4]) {
      const day = firstDay + week * 7 * DAY + offset * DAY
      if (day < SHOWCASE_NOW - DAY / 2) days.push(day)
    }
  }
  // Today's workout started at 18:20 and is still open.
  days.push(SHOWCASE_NOW - 40 * MINUTE)

  const workouts: Workout[] = []
  const setEntries: SetEntry[] = []
  days.forEach((startedAt, index) => {
    const r = index % ROUTINES.length
    const session = Math.floor(index / ROUTINES.length)
    const inProgress = index === days.length - 1
    const timerStartedAt = startedAt + 2 * MINUTE
    const endedAt = inProgress ? null : startedAt + (62 + (index % 3) * 4) * MINUTE

    const workout = record<Workout>(startedAt, {
      routineId: routines[r].id,
      startedAt,
      endedAt,
      timerStartedAt,
      timerStoppedAt: endedAt,
      timerPausedAt: null,
      notes: '',
      updatedAt: endedAt ?? SHOWCASE_NOW,
    })
    workouts.push(workout)

    let position = 0
    for (const item of ROUTINES[r].plan) {
      const planned = plannedSet(item, session)
      const sets = [
        ...(item.warmup
          ? [
              {
                type: 'warmup' as const,
                weightKg: Math.round(planned.weightKg / 2),
                reps: 10,
              },
            ]
          : []),
        ...Array.from({ length: item.sets }, (_, s) => ({
          type: 'normal' as const,
          weightKg: planned.weightKg,
          // The last set is a little harder: one rep fewer.
          reps: s === item.sets - 1 && s > 0 ? planned.reps - 1 : planned.reps,
        })),
      ]
      for (const set of sets) {
        const done = !inProgress || position < completedInProgress
        const completedAt = done ? timerStartedAt + (position + 1) * 3 * MINUTE : null
        setEntries.push(
          record<SetEntry>(startedAt, {
            workoutId: workout.id,
            exerciseId: item.exerciseId,
            position,
            ...set,
            completedAt,
            updatedAt: completedAt ?? startedAt,
          }),
        )
        position++
      }
    }
  })

  return {
    format: 'encore-backup',
    schemaVersion: 3,
    exportedAt: SHOWCASE_NOW,
    tables: {
      exercises: [],
      splits: [split],
      routines,
      routineExercises,
      workouts,
      setEntries,
      settings: [],
    },
  }
}
