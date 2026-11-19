import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Exercise, ID } from '../../db/types'

/**
 * All exercises (including deleted ones) in an id -> exercise Map.
 * Includes deleted ones because the history needs to show an exercise's
 * name even after it was removed from the library.
 * `undefined` while loading.
 */
export function useExerciseMap(): Map<ID, Exercise> | undefined {
  return useLiveQuery(async () => {
    const exercises = await db.exercises.toArray()
    return new Map(exercises.map((exercise) => [exercise.id, exercise]))
  }, [])
}
