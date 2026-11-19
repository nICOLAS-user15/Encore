import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useParams } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { AnimatedNumber } from '../../ui/AnimatedNumber'
import { Card } from '../../ui/Card'
import { EmptyState } from '../../ui/EmptyState'
import { DumbbellIcon } from '../../ui/icons'
import { LineChart } from '../../ui/LineChart'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { listExerciseSessions, type ExerciseSession } from './exerciseHistory'

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
            {loaded ? (
              <>
                <ChartCard
                  title={t.exercises.detail.oneRepMaxChart}
                  values={sessions.map((session) => session.oneRepMax)}
                  formatValue={kg}
                />
                <ChartCard
                  title={t.exercises.detail.weightChart}
                  values={sessions.map((session) => session.topSet.weightKg)}
                  formatValue={kg}
                />
              </>
            ) : (
              <ChartCard
                title={t.exercises.detail.repsChart}
                values={sessions.map((session) => session.maxReps)}
                formatValue={String}
              />
            )}
            <SessionList sessions={sessions} kg={kg} />
          </>
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
}

function ChartCard({ title, values, formatValue }: ChartCardProps) {
  const { t } = useI18n()
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
        {title}
      </h2>
      {values.length < 2 ? (
        <p className="text-sm text-muted">{t.exercises.detail.needMore}</p>
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
