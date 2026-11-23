import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { db } from '../../db/db'
import type { ID, RoutineExercise, SetEntry, Timestamp } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { MoreIcon } from '../../ui/icons'
import { Sheet } from '../../ui/Sheet'
import { useAction, useToast } from '../../ui/toastContext'
import { getExerciseBest } from '../records/recordsQueries'
import { recordSetIds } from '../records/recordsStats'
import { isSuggestionApplied, pendingPlannedSets, suggestNextLoad } from './progression'
import { ExerciseNoteEditor } from './ExerciseNoteEditor'
import { SetRow } from './SetRow'
import { addSet, applyLoadSuggestion, setExerciseNote } from './workoutActions'
import { getExerciseNote, getLastPerformance } from './workoutQueries'
import { numberSets, previousSetsById } from './workoutStats'

type ExerciseBlockProps = {
  workoutId: ID
  /** When the workout started: only sets done before it count for records. */
  workoutStartedAt: Timestamp
  exerciseId: ID
  name: string
  sets: SetEntry[]
  /** Routine target for this exercise (absent in a free workout). */
  target?: RoutineExercise
  /** The day's note of this exercise in this workout ('' = none). */
  note: string
  /** Id of the next set in the whole workout (may belong to another exercise). */
  nextSetId: ID | null
  /** Equipment load step for the suggestion; `null` = bodyweight (reps only). */
  progressionStepKg: number | null
  onEditSet: (set: SetEntry) => void
  onToggleSet: (set: SetEntry) => void
  onRemove: () => void
}

/** An exercise in the active workout: target, "last time", load suggestion and the sets. */
export function ExerciseBlock({
  workoutId,
  workoutStartedAt,
  exerciseId,
  name,
  sets,
  target,
  note: todayNote,
  nextSetId,
  progressionStepKg,
  onEditSet,
  onToggleSet,
  onRemove,
}: ExerciseBlockProps) {
  const { t, format, note } = useI18n()
  const [menuOpen, setMenuOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const run = useAction()
  // `undefined` = loading; `null` = never done before.
  const last = useLiveQuery(
    () => getLastPerformance(db, exerciseId, workoutId),
    [exerciseId, workoutId],
  )

  // The note left last time ('' = none): the reminder that matters before the first set.
  const lastWorkoutId = last?.workoutId ?? null
  const previousNote = useLiveQuery(
    async () => (lastWorkoutId ? getExerciseNote(db, lastWorkoutId, exerciseId) : ''),
    [lastWorkoutId, exerciseId],
  )

  // Personal records: the best done before this workout (`null` = never done before).
  const best = useLiveQuery(
    () => getExerciseBest(db, exerciseId, { workoutId, startedAt: workoutStartedAt }),
    [exerciseId, workoutId, workoutStartedAt],
  )
  const recordIds = best === undefined ? new Set<ID>() : recordSetIds(sets, best)
  useNewRecordNotice(best === undefined ? null : recordIds, name)

  // Working set numbers (1, 2, 3); warm-up stays null and becomes "AQ".
  const numbers = numberSets(sets)
  // Last time's same set, under each set's numbers (none while loading or never done).
  const previousById = previousSetsById(sets, last?.sets ?? [])

  let previous: string | null = null
  if (last) {
    previous = t.workout.lastTime(format.setsSummary(last.sets))
  } else if (last === null && target && target.referenceWeightKg !== null) {
    previous = t.workout.reference(
      format.reference(target.referenceWeightKg, target.referenceReps),
    )
  }

  // Progression suggestion: needs history (last time) and the routine's range.
  const suggestion =
    last && target
      ? suggestNextLoad(
          last.sets,
          { min: target.targetRepsMin, max: target.targetRepsMax },
          progressionStepKg,
        )
      : null
  const pending = pendingPlannedSets(sets)

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl leading-tight font-bold uppercase">
            {name}
          </h2>
          <div className="-mt-2 -mr-2 flex shrink-0 items-center">
            {target && (
              <span className="font-display text-lg font-semibold text-muted tabular-nums">
                {format.target(
                  target.targetSets,
                  target.targetRepsMin,
                  target.targetRepsMax,
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t.workout.moreOptions(name)}
              className="flex size-12 items-center justify-center text-muted active:text-text [&>svg]:size-6"
            >
              <MoreIcon />
            </button>
          </div>
        </div>
        {previous && <p className="text-sm text-muted tabular-nums">{previous}</p>}
        {previousNote && (
          <p className="text-sm break-words whitespace-pre-line text-muted">
            {t.workout.note.previous(previousNote)}
          </p>
        )}
        {target?.notes && <p className="text-sm text-muted">{note(target.notes)}</p>}
      </div>

      {todayNote && (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          aria-label={t.workout.note.editLabel(name, todayNote)}
          className="min-h-12 border-l-2 border-line-strong pl-3 text-left text-sm break-words whitespace-pre-line text-text active:bg-surface-high"
        >
          {todayNote}
        </button>
      )}

      {suggestion && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-l-4 border-text pl-3">
          <p className="min-w-0">
            <span className="block text-xs font-semibold tracking-widest text-muted uppercase">
              {t.workout.suggestion.label} ·{' '}
              {suggestion.kind === 'increase'
                ? t.workout.suggestion.increase
                : t.workout.suggestion.moreReps}
            </span>
            <span className="font-display text-xl font-bold tabular-nums">
              {format.set(suggestion.weightKg, suggestion.reps)}
            </span>
          </p>
          {/* With no pending sets there is nothing to apply: shows nothing on the right. */}
          {pending.length > 0 &&
            (isSuggestionApplied(sets, suggestion) ? (
              <span className="shrink-0 text-xs font-semibold tracking-widest text-muted uppercase">
                {t.workout.suggestion.applied}
              </span>
            ) : (
              <Button
                aria-label={t.workout.suggestion.applyTo(name)}
                onClick={() =>
                  void run(() =>
                    applyLoadSuggestion(db, workoutId, exerciseId, {
                      weightKg: suggestion.weightKg,
                      reps: suggestion.reps,
                    }),
                  )
                }
              >
                {t.workout.suggestion.apply}
              </Button>
            ))}
        </div>
      )}

      <ol className="flex flex-col gap-2">
        {sets.map((set, index) => (
          <SetRow
            key={set.id}
            set={set}
            label={numbers[index] ?? t.workout.warmupShort}
            exerciseName={name}
            isNext={set.id === nextSetId}
            isRecord={recordIds.has(set.id)}
            previous={previousById.get(set.id)}
            onEdit={() => onEditSet(set)}
            onToggle={() => onToggleSet(set)}
          />
        ))}
      </ol>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => void run(() => addSet(db, workoutId, exerciseId, 'normal'))}
        >
          {t.workout.addSet}
        </Button>
        <Button
          onClick={() => void run(() => addSet(db, workoutId, exerciseId, 'encore'))}
        >
          {t.workout.addEncore}
        </Button>
      </div>

      {/* Less-used actions live in the ⋯ menu: the card stays clean and "Remover"
          (which deletes) no longer sits next to the everyday buttons. */}
      <Sheet open={menuOpen} title={name} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            onClick={() => {
              setMenuOpen(false)
              setNoteOpen(true)
            }}
          >
            {todayNote ? t.workout.note.edit : t.workout.note.add}
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setMenuOpen(false)
              void run(() => addSet(db, workoutId, exerciseId, 'warmup'))
            }}
          >
            {t.workout.addWarmup}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => {
              setMenuOpen(false)
              onRemove() // opens the confirmation
            }}
          >
            {t.workout.removeExercise}
          </Button>
        </div>
      </Sheet>

      <ExerciseNoteEditor
        open={noteOpen}
        name={name}
        note={todayNote}
        onClose={() => setNoteOpen(false)}
        onSave={(text) => {
          setNoteOpen(false)
          void run(() => setExerciseNote(db, workoutId, exerciseId, text))
        }}
      />
    </Card>
  )
}

/**
 * Shows "New record: <exercise>" when a set BECOMES a record while the screen is open
 * (completing a heavier set, or editing one). Records that already existed when the
 * workout was opened do not trigger it. `recordIds` is `null` while still loading.
 */
function useNewRecordNotice(recordIds: Set<ID> | null, exerciseName: string) {
  const { t } = useI18n()
  const { showInfo } = useToast()
  const seen = useRef<Set<ID> | null>(null)
  const key = recordIds === null ? null : [...recordIds].sort().join(',')

  useEffect(() => {
    if (key === null) {
      return
    }
    const current = new Set(key === '' ? [] : key.split(','))
    const previous = seen.current
    seen.current = current
    if (previous !== null && [...current].some((id) => !previous.has(id))) {
      showInfo(t.records.newRecord(exerciseName))
    }
  }, [key, exerciseName, showInfo, t])
}
