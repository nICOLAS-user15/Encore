import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { CalendarIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { useAction, useToast } from '../../ui/toastContext'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { deleteWorkout, restoreWorkout } from '../workout/workoutActions'
import { groupSetsByExercise, numberSets } from '../workout/workoutStats'
import { getWorkoutSummary } from './historyQueries'
import { ComparisonCard } from './ComparisonCard'
import { SummaryStats } from './SummaryStats'

/** Detail of a history workout (route /historico/:workoutId). */
export function WorkoutDetailScreen() {
  const { t, format, exerciseName } = useI18n()
  // useParams reads the `:workoutId` piece of the URL.
  const { workoutId = '' } = useParams()
  const navigate = useNavigate()
  const summary = useLiveQuery(() => getWorkoutSummary(db, workoutId), [workoutId])
  const exerciseMap = useExerciseMap()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const run = useAction()
  const { showUndo } = useToast()

  if (summary === undefined || !exerciseMap) {
    return <ScreenHeader title={t.history.title} /> // loading
  }

  if (summary === null) {
    return (
      <>
        <ScreenHeader title={t.workout.title} />
        <div className="flex flex-col gap-4 px-4 py-6">
          <EmptyState
            icon={<CalendarIcon />}
            title={t.history.notFoundTitle}
            description={t.history.notFoundDescription}
          />
        </div>
      </>
    )
  }

  const { workout, routineName, sets } = summary
  const groups = groupSetsByExercise(sets)

  async function handleDelete() {
    const setIds = await run(() => deleteWorkout(db, workout.id))
    if (setIds === undefined) {
      setConfirmOpen(false)
      return
    }
    showUndo(t.history.workoutDeleted, () => restoreWorkout(db, workout.id, setIds))
    // replace: the "back" button must not bring back a deleted workout.
    navigate('/historico', { replace: true })
  }

  return (
    <>
      <ScreenHeader
        title={routineName ?? t.workout.freeWorkout}
        eyebrow={`${format.workoutDate(workout.startedAt)} · ${format.time(workout.startedAt)}`}
      />
      <div className="flex flex-col gap-4 px-4 py-4">
        <Card>
          <SummaryStats summary={summary} />
        </Card>
        <ComparisonCard summary={summary} />

        {groups.map((group) => (
          <Card key={group.exerciseId} className="flex flex-col gap-2">
            <h2 className="font-display text-2xl leading-tight font-bold uppercase">
              {exerciseName(exerciseMap.get(group.exerciseId))}
            </h2>
            <ol className="flex flex-col">
              {group.sets.map((set, index, all) => (
                <li
                  key={set.id}
                  className="flex min-h-11 items-center gap-3 border-b border-line last:border-b-0"
                >
                  <span className="w-6 font-display text-lg font-semibold text-muted tabular-nums">
                    {numberSets(all)[index] ?? t.workout.warmupShort}
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums">
                    {format.set(set.weightKg, set.reps)}
                  </span>
                  {set.type === 'encore' && (
                    <span className="ml-auto border-2 border-line px-1.5 text-xs font-bold tracking-wider text-muted uppercase">
                      {t.workout.encore}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        ))}

        <Button variant="ghost" fullWidth onClick={() => setConfirmOpen(true)}>
          {t.history.deleteWorkout}
        </Button>
      </div>

      <ConfirmSheet
        open={confirmOpen}
        title={t.history.deleteTitle}
        description={t.history.deleteDescription}
        confirmLabel={t.history.deleteConfirm}
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
