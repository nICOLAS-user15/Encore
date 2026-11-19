import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../../db/db'
import type { Exercise, ID, SetEntry, Workout } from '../../db/types'
import { useI18n } from '../../i18n/context'
import type { Messages } from '../../i18n/pt'
import { Button } from '../../ui/Button'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { BarbellIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { useAction, useToast } from '../../ui/toastContext'
import { ExercisePicker } from '../exercises/ExercisePicker'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { restSecondsOf } from '../routines/routineActions'
import { listRoutineExercises } from '../routines/routineQueries'
import { unlockAudio } from '../../lib/beep'
import { useWakeLock } from '../../lib/useWakeLock'
import { weightStepFor } from '../settings/settingsRepository'
import { useSettings } from '../settings/useSettings'
import { ExerciseBlock } from './ExerciseBlock'
import { useRest } from './restContext'
import { SetEditor, type SetValues } from './SetEditor'
import { WorkoutTimer } from './WorkoutTimer'
import {
  addExerciseToWorkout,
  deleteSet,
  deleteWorkout,
  finishWorkout,
  followWeightChange,
  removeExerciseFromWorkout,
  restoreSets,
  toggleSetCompleted,
  updateSet,
} from './workoutActions'
import { listWorkoutSets } from './workoutQueries'
import { groupSetsByExercise, nextPendingSetId, numberSets } from './workoutStats'

/** Which confirmation is open (union type: only one case at a time). */
type Confirmation =
  { kind: 'finish' } | { kind: 'discard' } | { kind: 'remove'; exerciseId: ID } | null

export function ActiveWorkout({ workout }: { workout: Workout }) {
  const { t, exerciseName, note } = useI18n()
  const rest = useRest()
  const run = useAction()
  const { showUndo } = useToast()
  const { settings } = useSettings()
  const exerciseMap = useExerciseMap()
  // Keep the screen on for the whole workout (if the Settings option is on).
  useWakeLock(settings.keepScreenOn)

  const sets = useLiveQuery(() => listWorkoutSets(db, workout.id), [workout.id])
  const routine = useLiveQuery(
    async () =>
      workout.routineId ? ((await db.routines.get(workout.routineId)) ?? null) : null,
    [workout.routineId],
  )
  const targets = useLiveQuery(
    async () => (workout.routineId ? listRoutineExercises(db, workout.routineId) : []),
    [workout.routineId],
  )

  const [editingSetId, setEditingSetId] = useState<ID | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation>(null)

  // Some of the queries are still loading.
  if (!sets || !exerciseMap || routine === undefined || !targets) {
    // Loading: header first, so the screen does not "jump" when the content arrives.
    return <ScreenHeader title={routine?.name ?? t.workout.title} />
  }

  const groups = groupSetsByExercise(sets)
  const nextSetId = nextPendingSetId(groups)
  const targetByExercise = new Map(targets.map((target) => [target.exerciseId, target]))
  const completedCount = sets.filter((set) => set.completedAt !== null).length
  const editingSet = sets.find((set) => set.id === editingSetId) ?? null
  const nameOf = (exerciseId: ID) => exerciseName(exerciseMap.get(exerciseId))
  // Exercise equipment (barbell if not found): defines the load steps.
  const equipmentOf = (exerciseId: ID) =>
    exerciseMap.get(exerciseId)?.equipment ?? 'barbell'
  /** Step for the suggestion: `null` for bodyweight (progresses in reps). */
  const progressionStepOf = (exerciseId: ID) => {
    const equipment = equipmentOf(exerciseId)
    return equipment === 'bodyweight' ? null : weightStepFor(settings, equipment)
  }

  // Editor title: "Supino reto · Série 2" (position within the exercise, starting at 1).
  let editorTitle = ''
  if (editingSet) {
    const name = nameOf(editingSet.exerciseId)
    const group = groups.find((item) => item.exerciseId === editingSet.exerciseId)
    const sets = group?.sets ?? []
    const number = numberSets(sets)[sets.findIndex((set) => set.id === editingSet.id)]
    editorTitle =
      number == null ? t.workout.warmupTitle(name) : t.workout.setTitle(name, number)
  }

  /** Rest for the exercise: the routine's, if set; otherwise the Settings default. */
  function restSecondsFor(exerciseId: ID): number {
    const target = targetByExercise.get(exerciseId)
    return (target ? restSecondsOf(target) : null) ?? settings.restSeconds
  }

  /** Starts the rest, if the user left that on in Settings. */
  function maybeStartRest(exerciseId: ID) {
    if (settings.autoStartRest) {
      rest.start(restSecondsFor(exerciseId))
    }
  }

  /**
   * Unlocks audio while we are still inside the user's tap
   * (before any await), so the beep can play when the rest ends.
   */
  function prepareRestSound() {
    if (settings.restSound) {
      unlockAudio()
    }
  }

  async function handleToggle(set: SetEntry) {
    prepareRestSound()
    const nowCompleted = await run(() => toggleSetCompleted(db, set.id))
    if (nowCompleted) {
      maybeStartRest(set.exerciseId)
    }
  }

  async function handleSave(values: SetValues, complete: boolean) {
    prepareRestSound()
    if (!editingSet) {
      return
    }
    const saved = editingSet
    const ok = await run(async () => {
      await updateSet(db, saved.id, values)
      // The next pending sets with the old load follow the new one.
      await followWeightChange(db, saved, saved.weightKg, values.weightKg)
      if (complete && saved.completedAt === null) {
        await toggleSetCompleted(db, saved.id)
      }
      return true
    })
    if (ok && complete && saved.completedAt === null) {
      maybeStartRest(saved.exerciseId)
    }
    setEditingSetId(null)
  }

  async function handleDeleteSet() {
    const deleted = editingSet
    setEditingSetId(null)
    if (deleted) {
      const done = await run(() => deleteSet(db, deleted.id))
      if (done !== undefined) {
        showUndo(t.workout.setDeleted, () => restoreSets(db, [deleted.id]))
      }
    }
  }

  async function handlePick(exercise: Exercise) {
    await run(() => addExerciseToWorkout(db, workout.id, exercise.id))
    setPickerOpen(false)
  }

  async function handleConfirm() {
    // Finishing or discarding does not navigate from here: ActiveWorkoutScreen notices that the
    // workout is no longer active and goes to the history (or back to the list).
    const current = confirmation
    setConfirmation(null)
    if (current?.kind === 'finish') {
      if ((await run(() => finishWorkout(db, workout.id))) !== undefined) {
        rest.stop()
      }
    } else if (current?.kind === 'discard') {
      if ((await run(() => deleteWorkout(db, workout.id))) !== undefined) {
        rest.stop()
      }
    } else if (current?.kind === 'remove') {
      const removedIds = await run(() =>
        removeExerciseFromWorkout(db, workout.id, current.exerciseId),
      )
      if (removedIds !== undefined) {
        showUndo(t.workout.exerciseRemoved, () => restoreSets(db, removedIds))
      }
    }
  }

  return (
    <>
      <ScreenHeader title={routine?.name ?? t.workout.freeWorkout} />

      {/* pb-32: room so the rest bar does not cover the end of the list. */}
      <div className="flex flex-col gap-4 px-4 pt-6 pb-32">
        <WorkoutTimer
          workout={workout}
          // Only one red button per screen: before the 1st set, it is "Iniciar";
          // after that, the red moves to "Finalizar treino".
          emphasizeStart={completedCount === 0}
          emphasizeFinish={completedCount > 0}
          onFinish={() => setConfirmation({ kind: 'finish' })}
          onRest={() => {
            prepareRestSound()
            // Manual "Descansar": the rest of the exercise the user is on
            // (the next set's); with no next set, the default.
            const current = sets.find((set) => set.id === nextSetId)
            rest.start(
              current ? restSecondsFor(current.exerciseId) : settings.restSeconds,
            )
          }}
        />

        {routine?.notes && (
          <p className="border-l-4 border-text pl-3 text-sm font-semibold">
            {note(routine.notes)}
          </p>
        )}

        {groups.length === 0 && (
          <EmptyState
            icon={<BarbellIcon />}
            title={t.workout.emptyTitle}
            description={t.workout.emptyDescription}
          />
        )}

        {groups.map((group) => (
          <ExerciseBlock
            key={group.exerciseId}
            workoutId={workout.id}
            exerciseId={group.exerciseId}
            name={nameOf(group.exerciseId)}
            sets={group.sets}
            target={targetByExercise.get(group.exerciseId)}
            nextSetId={nextSetId}
            progressionStepKg={progressionStepOf(group.exerciseId)}
            onEditSet={(set) => setEditingSetId(set.id)}
            onToggleSet={(set) => void handleToggle(set)}
            onRemove={() =>
              setConfirmation({ kind: 'remove', exerciseId: group.exerciseId })
            }
          />
        ))}

        <Button fullWidth onClick={() => setPickerOpen(true)}>
          {t.workout.addExercise}
        </Button>

        <div className="mt-4 flex flex-col gap-3 border-t-2 border-line pt-6">
          {/* With the timer started, "Finalizar treino" lives in the timer card. */}
          {workout.timerStartedAt === null && (
            <Button
              variant={completedCount > 0 ? 'primary' : 'secondary'}
              fullWidth
              onClick={() => setConfirmation({ kind: 'finish' })}
            >
              {t.workout.finish}
            </Button>
          )}
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setConfirmation({ kind: 'discard' })}
          >
            {t.workout.discard}
          </Button>
        </div>
      </div>

      <SetEditor
        set={editingSet}
        title={editorTitle}
        weightStepKg={
          editingSet ? weightStepFor(settings, equipmentOf(editingSet.exerciseId)) : 2.5
        }
        onClose={() => setEditingSetId(null)}
        onSave={(values, complete) => void handleSave(values, complete)}
        onDelete={() => void handleDeleteSet()}
      />

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) => void handlePick(exercise)}
      />

      <ConfirmSheet
        open={confirmation !== null}
        {...confirmationTexts(t, confirmation, completedCount, nameOf)}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmation(null)}
      />
    </>
  )
}

/** Texts for each confirmation. */
function confirmationTexts(
  t: Messages,
  confirmation: Confirmation,
  completedCount: number,
  nameOf: (exerciseId: ID) => string,
) {
  const texts = t.workout.confirm
  switch (confirmation?.kind) {
    case 'finish':
      return {
        title: texts.finishTitle,
        description:
          completedCount > 0
            ? texts.finishDescription(completedCount)
            : texts.finishEmptyDescription,
        confirmLabel: completedCount > 0 ? texts.finishConfirm : texts.discardConfirm,
        // With no set done, "finish" effectively discards the workout.
        destructive: completedCount === 0,
      }
    case 'discard':
      return {
        title: texts.discardTitle,
        description: texts.discardDescription,
        confirmLabel: texts.discardConfirm,
        destructive: true,
      }
    case 'remove':
      return {
        title: texts.removeTitle,
        description: texts.removeDescription(nameOf(confirmation.exerciseId)),
        confirmLabel: texts.removeConfirm,
        destructive: true,
      }
    default:
      return { title: '', description: '', confirmLabel: '' }
  }
}
