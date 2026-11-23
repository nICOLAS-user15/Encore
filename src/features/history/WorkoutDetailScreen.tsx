import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { db } from '../../db/db'
import type { ID } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { CalendarIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { useAction, useToast } from '../../ui/toastContext'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { RecordBadge } from '../records/RecordBadge'
import { getWorkoutRecordIds } from '../records/recordsQueries'
import { weightStepFor } from '../settings/settingsRepository'
import { useSettings } from '../settings/useSettings'
import { SetEditor, type SetValues } from '../workout/SetEditor'
import {
  addSetToFinishedWorkout,
  deleteSet,
  deleteWorkout,
  restoreSets,
  restoreWorkout,
  updateSet,
} from '../workout/workoutActions'
import { groupSetsByExercise, numberSets } from '../workout/workoutStats'
import { getWorkoutSummary } from './historyQueries'
import { ComparisonCard } from './ComparisonCard'
import { SummaryStats } from './SummaryStats'

/**
 * Detail of a history workout (route /historico/:workoutId). The sets can be corrected
 * here: tapping one opens the same editor as the active workout, and "+ Série" logs a
 * set that was done but not marked. Records, comparison and charts follow on their own.
 */
export function WorkoutDetailScreen() {
  const { t, format, exerciseName } = useI18n()
  // useParams reads the `:workoutId` piece of the URL.
  const { workoutId = '' } = useParams()
  const navigate = useNavigate()
  const summary = useLiveQuery(() => getWorkoutSummary(db, workoutId), [workoutId])
  const exerciseMap = useExerciseMap()
  const { settings } = useSettings()
  const recordIds = useLiveQuery(
    async () =>
      summary
        ? getWorkoutRecordIds(
            db,
            { workoutId: summary.workout.id, startedAt: summary.workout.startedAt },
            summary.sets,
          )
        : new Set<string>(),
    [summary],
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editingSetId, setEditingSetId] = useState<ID | null>(null)
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
  const nameOf = (exerciseId: ID) => exerciseName(exerciseMap.get(exerciseId))

  // Set being edited, with the editor title ("Supino reto · Série 2") and the load step.
  const editingSet = sets.find((set) => set.id === editingSetId) ?? null
  let editorTitle = ''
  let editorStepKg = 2.5
  if (editingSet) {
    const groupSets =
      groups.find((group) => group.exerciseId === editingSet.exerciseId)?.sets ?? []
    const number =
      numberSets(groupSets)[groupSets.findIndex((set) => set.id === editingSet.id)]
    const name = nameOf(editingSet.exerciseId)
    editorTitle =
      number == null ? t.workout.warmupTitle(name) : t.workout.setTitle(name, number)
    editorStepKg = weightStepFor(
      settings,
      exerciseMap.get(editingSet.exerciseId)?.equipment ?? 'barbell',
    )
  }

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

  async function handleSaveSet(values: SetValues) {
    const saved = editingSet
    setEditingSetId(null)
    if (saved) {
      await run(() => updateSet(db, saved.id, values))
    }
  }

  async function handleDeleteSet() {
    const deleted = editingSet
    setEditingSetId(null)
    if (deleted) {
      const deletedId = await run(() => deleteSet(db, deleted.id))
      if (deletedId !== undefined) {
        showUndo(t.workout.setDeleted, () => restoreSets(db, [deletedId]))
      }
    }
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
        {recordIds && recordIds.size > 0 && (
          <p className="flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-accent-bright uppercase">
            <RecordBadge />
            {t.records.inWorkout(recordIds.size)}
          </p>
        )}
        <ComparisonCard summary={summary} />

        <p className="text-sm text-muted">{t.history.editHint}</p>

        {groups.map((group) => {
          const name = nameOf(group.exerciseId)
          const numbers = numberSets(group.sets)
          return (
            <Card key={group.exerciseId} className="flex flex-col gap-2">
              <h2 className="font-display text-2xl leading-tight font-bold uppercase">
                {name}
              </h2>
              <ol className="flex flex-col">
                {group.sets.map((set, index) => {
                  const label = numbers[index] ?? t.workout.warmupShort
                  const isRecord = recordIds?.has(set.id) ?? false
                  return (
                    <li key={set.id} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setEditingSetId(set.id)}
                        aria-label={t.workout.editSet(
                          label,
                          `${name}, ${format.set(set.weightKg, set.reps)}${isRecord ? `, ${t.records.personalRecord}` : ''}`,
                        )}
                        className="flex min-h-12 w-full items-center gap-3 text-left active:bg-surface-high"
                      >
                        <span className="w-6 font-display text-lg font-semibold text-muted tabular-nums">
                          {label}
                        </span>
                        <span className="font-display text-xl font-bold tabular-nums">
                          {format.set(set.weightKg, set.reps)}
                        </span>
                        {(isRecord || set.type === 'encore') && (
                          <span className="ml-auto flex items-center gap-1.5">
                            {isRecord && <RecordBadge />}
                            {set.type === 'encore' && (
                              <span className="border-2 border-line px-1.5 text-xs font-bold tracking-wider text-muted uppercase">
                                {t.workout.encore}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ol>
              <Button
                aria-label={t.history.addSetTo(name)}
                onClick={() =>
                  void run(() =>
                    addSetToFinishedWorkout(db, workout.id, group.exerciseId),
                  )
                }
              >
                {t.workout.addSet}
              </Button>
            </Card>
          )
        })}

        <Button variant="ghost" fullWidth onClick={() => setConfirmOpen(true)}>
          {t.history.deleteWorkout}
        </Button>
      </div>

      <SetEditor
        set={editingSet}
        title={editorTitle}
        weightStepKg={editorStepKg}
        // The only set left: deleting it would leave an empty workout ("Excluir treino" does that).
        canDelete={sets.length > 1}
        onClose={() => setEditingSetId(null)}
        onSave={(values) => void handleSaveSet(values)}
        onDelete={() => void handleDeleteSet()}
      />

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
