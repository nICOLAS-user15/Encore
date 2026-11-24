import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { db } from '../../db/db'
import { restoreRecord } from '../../db/repository'
import type { Exercise } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { inPeriod, type Period } from '../../lib/period'
import { useNow } from '../../lib/useNow'
import { AnimatedNumber } from '../../ui/AnimatedNumber'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { DumbbellIcon } from '../../ui/icons'
import { LineChart } from '../../ui/LineChart'
import { PeriodTabs } from '../../ui/PeriodTabs'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { Sheet } from '../../ui/Sheet'
import { SkeletonList } from '../../ui/Skeleton'
import { useAction, useToast } from '../../ui/toastContext'
import {
  deleteCustomExercise,
  routinesUsingExercise,
  updateCustomExercise,
} from './exerciseActions'
import { listExerciseSessions, type ExerciseSession } from './exerciseHistory'
import { NewExerciseForm } from './NewExerciseForm'

/**
 * Progress of one exercise (route /exercicios/:exerciseId): personal bests, how the
 * estimated 1RM and the heaviest load evolved session by session, and every session,
 * each linking to its workout in the history.
 */
export function ExerciseDetailScreen() {
  const { t, format, exerciseName } = useI18n()
  const { exerciseId = '' } = useParams()
  // `null` = not found (deleted or bad link); `undefined` = loading.
  const exercise = useLiveQuery(
    async () => (await db.exercises.get(exerciseId)) ?? null,
    [exerciseId],
  )
  const sessions = useLiveQuery(() => listExerciseSessions(db, exerciseId), [exerciseId])
  // Charts default to the last year: years of sessions would squeeze the line flat.
  const [period, setPeriod] = useState<Period>('1y')
  const now = useNow(60_000)

  if (exercise === undefined || sessions === undefined) {
    return (
      <>
        <ScreenHeader title={t.exercises.title} />
        <div className="px-4 py-6">
          <SkeletonList />
        </div>
      </>
    )
  }

  if (exercise === null) {
    return (
      <>
        <ScreenHeader title={t.exercises.title} />
        <div className="px-4 py-6">
          <EmptyState
            icon={<DumbbellIcon />}
            title={t.exercises.detail.notFoundTitle}
            description={t.exercises.detail.notFoundDescription}
          />
        </div>
      </>
    )
  }

  const kg = (value: number) => `${format.decimal(value)} ${t.common.kg}`
  // Bodyweight work has no load to chart: show reps instead.
  const loaded = sessions.some((session) => session.topSet.weightKg > 0)
  const charted = inPeriod(sessions, (session) => session.date, period, now)
  // With 2+ sessions overall, fewer in the period is the period's fault, not "train more".
  const chartEmpty =
    sessions.length >= 2 ? t.common.period.tooFew : t.exercises.detail.needMore

  return (
    <>
      <ScreenHeader
        title={exerciseName(exercise)}
        eyebrow={`${t.muscleGroups[exercise.muscleGroup]} · ${t.equipment[exercise.equipment]}`}
      />
      <div className="stagger flex flex-col gap-4 px-4 py-6">
        {sessions.length === 0 ? (
          <EmptyState
            icon={<DumbbellIcon />}
            title={t.exercises.detail.emptyTitle}
            description={t.exercises.detail.emptyDescription}
          />
        ) : (
          <>
            {loaded && <BestsCard sessions={sessions} kg={kg} />}
            {sessions.length >= 2 && <PeriodTabs value={period} onChange={setPeriod} />}
            {loaded ? (
              <>
                <ChartCard
                  title={t.exercises.detail.oneRepMaxChart}
                  values={charted.map((session) => session.oneRepMax)}
                  formatValue={kg}
                  emptyText={chartEmpty}
                />
                <ChartCard
                  title={t.exercises.detail.weightChart}
                  values={charted.map((session) => session.topSet.weightKg)}
                  formatValue={kg}
                  emptyText={chartEmpty}
                />
              </>
            ) : (
              <ChartCard
                title={t.exercises.detail.repsChart}
                values={charted.map((session) => session.maxReps)}
                formatValue={String}
                emptyText={chartEmpty}
              />
            )}
            <SessionList sessions={sessions} kg={kg} />
          </>
        )}
        {exercise.isCustom && exercise.deletedAt === null && (
          <ManageCustomExercise exercise={exercise} />
        )}
      </div>
    </>
  )
}

type SessionsProps = { sessions: ExerciseSession[]; kg: (value: number) => string }

function BestsCard({ sessions, kg }: SessionsProps) {
  const { t } = useI18n()
  const heaviest = Math.max(...sessions.map((session) => session.topSet.weightKg))
  const bestOneRepMax = Math.max(...sessions.map((session) => session.oneRepMax))
  return (
    <Card>
      <h2 className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
        {t.exercises.detail.records}
      </h2>
      <dl className="grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-muted">{t.exercises.detail.heaviest}</dt>
          <dd className="font-display text-3xl font-bold tabular-nums">
            <AnimatedNumber value={heaviest} format={kg} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">{t.exercises.detail.bestOneRepMax}</dt>
          <dd className="font-display text-3xl font-bold text-accent-bright tabular-nums">
            <AnimatedNumber value={bestOneRepMax} format={kg} />
          </dd>
        </div>
      </dl>
    </Card>
  )
}

type ChartCardProps = {
  title: string
  values: number[]
  formatValue: (value: number) => string
  /** Shown instead of the chart with fewer than 2 points. */
  emptyText: string
}

function ChartCard({ title, values, formatValue, emptyText }: ChartCardProps) {
  const { t } = useI18n()
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
        {title}
      </h2>
      {values.length < 2 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <LineChart
          values={values}
          formatValue={formatValue}
          label={t.exercises.detail.chartSummary(
            title,
            formatValue(values[0]),
            formatValue(values[values.length - 1]),
            values.length,
          )}
        />
      )}
    </Card>
  )
}

function SessionList({ sessions, kg }: SessionsProps) {
  const { t, format } = useI18n()
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-2xl leading-tight font-bold uppercase">
        {t.exercises.detail.sessions}
      </h2>
      <ol className="flex flex-col gap-2">
        {/* Newest first: the latest session is the one you want to compare with. */}
        {[...sessions].reverse().map((session) => (
          <li key={session.workoutId}>
            <Link
              to={`/historico/${session.workoutId}`}
              className="press flex min-h-14 items-center justify-between gap-3 rounded-sm border-2 border-line bg-surface px-4 py-2 shadow-card active:border-text"
            >
              <span>
                <span className="block text-xs font-semibold tracking-widest text-muted uppercase">
                  {format.workoutDate(session.date)}
                </span>
                <span className="font-display text-xl font-bold tabular-nums">
                  {t.exercises.detail.topSet(
                    format.set(session.topSet.weightKg, session.topSet.reps),
                  )}
                </span>
              </span>
              {session.oneRepMax > 0 && (
                <span className="shrink-0 text-sm text-muted tabular-nums">
                  {t.exercises.detail.oneRepMax(kg(session.oneRepMax))}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Which panel is open for a user exercise. */
type Panel = { kind: 'edit' } | { kind: 'delete' } | { kind: 'inUse'; routines: string[] }

/**
 * Edit and delete, only for exercises the user created (the library ones are matched by
 * name by the seed sync, so they stay as they are). Deleting is blocked while a routine
 * uses the exercise, so no routine is left with a hole.
 */
function ManageCustomExercise({ exercise }: { exercise: Exercise }) {
  const { t, exerciseName } = useI18n()
  const navigate = useNavigate()
  const run = useAction()
  const { showUndo } = useToast()
  const [panel, setPanel] = useState<Panel | null>(null)
  const [nameTaken, setNameTaken] = useState(false)

  async function handleDeleteTap() {
    const routines = await run(() => routinesUsingExercise(db, exercise.id))
    if (routines !== undefined) {
      setPanel(routines.length > 0 ? { kind: 'inUse', routines } : { kind: 'delete' })
    }
  }

  async function handleDelete() {
    setPanel(null)
    const result = await run(() => deleteCustomExercise(db, exercise.id))
    if (result?.kind === 'deleted') {
      showUndo(t.exercises.manage.deleted, () => restoreRecord(db.exercises, exercise.id))
      // replace: "back" must not land on a deleted exercise.
      void navigate('/exercicios', { replace: true })
    } else if (result?.kind === 'inUse') {
      setPanel(result)
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t-2 border-line pt-4">
      <Button
        fullWidth
        onClick={() => {
          setNameTaken(false)
          setPanel({ kind: 'edit' })
        }}
      >
        {t.exercises.manage.edit}
      </Button>
      <Button variant="ghost" fullWidth onClick={() => void handleDeleteTap()}>
        {t.exercises.manage.delete}
      </Button>

      <Sheet
        open={panel?.kind === 'edit'}
        title={t.exercises.manage.editTitle}
        onClose={() => setPanel(null)}
        dismissOnBackdrop={false}
      >
        {panel?.kind === 'edit' && (
          <NewExerciseForm
            initialName={exerciseName(exercise)}
            initialMuscleGroup={exercise.muscleGroup}
            initialEquipment={exercise.equipment}
            submitLabel={t.common.save}
            error={nameTaken ? t.exercises.manage.nameTaken : null}
            onCancel={() => setPanel(null)}
            onCreate={(input) =>
              void run(() => updateCustomExercise(db, exercise.id, input)).then(
                (result) => {
                  if (result === 'nameTaken') {
                    setNameTaken(true)
                  } else if (result !== undefined) {
                    setPanel(null)
                  }
                },
              )
            }
          />
        )}
      </Sheet>

      <ConfirmSheet
        open={panel?.kind === 'delete'}
        title={t.exercises.manage.deleteTitle}
        description={t.exercises.manage.deleteDescription}
        confirmLabel={t.exercises.manage.deleteConfirm}
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setPanel(null)}
      />

      <Sheet
        open={panel?.kind === 'inUse'}
        title={t.exercises.manage.inUseTitle}
        onClose={() => setPanel(null)}
      >
        <p className="mb-6 text-base leading-relaxed text-muted">
          {panel?.kind === 'inUse' &&
            t.exercises.manage.inUseDescription(panel.routines.join(', '))}
        </p>
        <Button fullWidth onClick={() => setPanel(null)}>
          {t.exercises.manage.understood}
        </Button>
      </Sheet>
    </div>
  )
}
