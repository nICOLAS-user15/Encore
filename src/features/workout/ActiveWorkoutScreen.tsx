import { useLiveQuery } from 'dexie-react-hooks'
import { Navigate, useParams } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { ActiveWorkout } from './ActiveWorkout'

/**
 * Route /treino/:workoutId: the workout in progress, with "Voltar" to the list.
 *
 * This screen also decides where to go when the workout stops being active,
 * because the database notifies on its own (useLiveQuery):
 * - finished → its detail in the history;
 * - discarded (or id that does not exist) → the workout list.
 * `replace`: the phone's "back" does not bring back a workout that already ended.
 */
export function ActiveWorkoutScreen() {
  const { workoutId = '' } = useParams()
  const { t } = useI18n()
  // `?? null` separates "does not exist" (null) from "loading" (undefined).
  const workout = useLiveQuery(
    async () => (await db.workouts.get(workoutId)) ?? null,
    [workoutId],
  )

  if (workout === undefined) {
    return <ScreenHeader title={t.workout.title} />
  }
  if (workout === null || workout.deletedAt !== null) {
    return <Navigate to="/treino" replace />
  }
  if (workout.endedAt !== null) {
    return <Navigate to={`/historico/${workout.id}`} replace />
  }
  // `key`: opening another workout restarts the component from scratch.
  return <ActiveWorkout key={workout.id} workout={workout} />
}
