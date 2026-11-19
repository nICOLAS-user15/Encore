import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { db } from '../../db/db'
import type { Exercise, ID } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { ListIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { SplitSheet } from '../splits/SplitSheet'
import { SplitTabs } from '../splits/SplitTabs'
import { createSplit } from '../splits/splitActions'
import { routinesOfSplit } from '../splits/splitUtils'
import { useSplits } from '../splits/useSplits'
import { startOrSwitchWorkout } from '../workout/workoutActions'
import { getActiveWorkout } from '../workout/workoutQueries'
import { listRoutinesWithExercises, type RoutineWithExercises } from './routineQueries'

/**
 * Rotinas tab: routines organized by workout split. The tabs at the top
 * (the same as on the Treino screen) choose the split; here you can also create,
 * rename, reorder and delete splits, and create routines inside the chosen one.
 */
export function RoutinesScreen() {
  const { t } = useI18n()
  const routines = useLiveQuery(() => listRoutinesWithExercises(db), [])
  // `?? null`: useLiveQuery uses `undefined` for "loading"; `null` = no active workout.
  const active = useLiveQuery(async () => (await getActiveWorkout(db)) ?? null, [])
  const exerciseMap = useExerciseMap()
  const { splits, active: currentSplit, select: selectSplit } = useSplits()
  const [blockedOpen, setBlockedOpen] = useState(false)
  // We keep the ID (not an "open/closed" flag): when creating a new split, the sheet
  // opens on it even before the tabs' selection finishes updating.
  const [editingSplitId, setEditingSplitId] = useState<ID | null>(null)
  const navigate = useNavigate()

  // Name of the workout in progress, for the warning ("Upper A is still in progress").
  const activeName =
    routines?.find((entry) => entry.routine.id === active?.routineId)?.routine.name ??
    t.workout.freeWorkout

  /**
   * Only one workout is active at a time. The same routine continues the workout; another
   * routine switches right away if the open workout has no sets done yet, otherwise
   * we warn first (see startOrSwitchWorkout).
   */
  async function handleStart(routineId: ID) {
    const result = await startOrSwitchWorkout(db, routineId)
    if (result.status === 'started') {
      navigate(`/treino/${result.workout.id}`)
    } else {
      setBlockedOpen(true)
    }
  }

  /** Creates a split, selects it in the tabs and opens the sheet to name it. */
  async function handleCreateSplit() {
    const id = await createSplit(db, t.splits.defaultName)
    await selectSplit(id)
    setEditingSplitId(id)
  }

  /** Opens the blank editor for a new routine in the chosen split (only exists after "Salvar"). */
  function handleCreate() {
    if (currentSplit) {
      navigate(`/rotinas/nova?divisao=${currentSplit.id}`)
    }
  }

  const visible =
    routines && splits && currentSplit
      ? routinesOfSplit(routines, splits, currentSplit)
      : (routines ?? [])
  const editingSplit = splits?.find((split) => split.id === editingSplitId) ?? null

  let content = null // loading
  if (routines && splits && splits.length === 0 && routines.length === 0) {
    content = (
      <EmptyState
        icon={<ListIcon />}
        title={t.routines.emptyTitle}
        description={t.routines.emptyDescription}
        action={
          <Button variant="primary" onClick={() => void handleCreateSplit()}>
            {t.splits.createFirst}
          </Button>
        }
      />
    )
  } else if (routines && splits && exerciseMap) {
    content = (
      <div className="flex flex-col gap-4">
        <SplitTabs
          splits={splits}
          activeId={currentSplit?.id ?? null}
          onSelect={(splitId) => void selectSplit(splitId)}
          onAdd={() => void handleCreateSplit()}
        />

        {currentSplit && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">
                {t.splits.routineCount(visible.length)}
              </p>
              {currentSplit.notes && <p className="text-sm">{currentSplit.notes}</p>}
            </div>
            <Button
              variant="ghost"
              className="-mt-2 -mr-3 shrink-0"
              onClick={() => setEditingSplitId(currentSplit.id)}
            >
              {t.splits.edit}
            </Button>
          </div>
        )}

        {currentSplit && (
          <Button fullWidth onClick={handleCreate}>
            {t.routines.newRoutine}
          </Button>
        )}

        {visible.length === 0 && <p className="text-muted">{t.splits.emptySplit}</p>}
        {visible.map((entry) => (
          <RoutineCard
            key={entry.routine.id}
            entry={entry}
            exerciseMap={exerciseMap}
            inProgress={active?.routineId === entry.routine.id}
            onStart={() => void handleStart(entry.routine.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <ScreenHeader title={t.routines.title} eyebrow={currentSplit?.name} />
      <div className="px-4 py-6">{content}</div>

      <SplitSheet
        split={editingSplit}
        routineCount={
          editingSplit && routines && splits
            ? routinesOfSplit(routines, splits, editingSplit).length
            : 0
        }
        isFirst={splits?.[0]?.id === editingSplit?.id}
        isLast={splits?.at(-1)?.id === editingSplit?.id}
        onClose={() => setEditingSplitId(null)}
      />

      <ConfirmSheet
        open={blockedOpen}
        title={t.routines.activeTitle}
        description={t.routines.activeDescription(activeName)}
        confirmLabel={t.routines.goToWorkout}
        onConfirm={() => active && navigate(`/treino/${active.id}`)}
        onCancel={() => setBlockedOpen(false)}
      />
    </>
  )
}

type RoutineCardProps = {
  entry: RoutineWithExercises
  exerciseMap: Map<ID, Exercise>
  /** This is the routine of the workout in progress: the button becomes "Continuar". */
  inProgress: boolean
  onStart: () => void
}

function RoutineCard({ entry, exerciseMap, inProgress, onStart }: RoutineCardProps) {
  const { t, format, exerciseName, note } = useI18n()
  const { routine, items } = entry

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-4 border-b-2 border-line py-2 pr-2 pl-4">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-bold uppercase">{routine.name}</h2>
          {routine.notes && <p className="text-sm text-muted">{note(routine.notes)}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to={`/rotinas/${routine.id}`}
            className="inline-flex min-h-12 items-center px-2 font-display text-lg font-semibold tracking-wide text-muted uppercase active:text-text"
          >
            {t.routines.edit}
          </Link>
          {/* Continuing the open workout is THE main action of this screen: it gets the accent. */}
          <Button variant={inProgress ? 'primary' : 'secondary'} onClick={onStart}>
            {inProgress ? t.routines.resume : t.routines.start}
          </Button>
        </div>
      </div>
      <ol>
        {items.map((item) => {
          const details = [
            item.referenceWeightKg !== null
              ? t.routines.reference(
                  format.reference(item.referenceWeightKg, item.referenceReps),
                )
              : null,
            item.notes ? note(item.notes) : null,
          ].filter(Boolean)

          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {exerciseName(exerciseMap.get(item.exerciseId))}
                </p>
                {details.length > 0 && (
                  <p className="text-sm text-muted">{details.join(' · ')}</p>
                )}
              </div>
              <span className="shrink-0 font-display text-lg font-semibold tabular-nums">
                {format.target(item.targetSets, item.targetRepsMin, item.targetRepsMax)}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
