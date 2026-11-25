import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { monthKey, monthSpan } from '../../lib/calendar'
import { useNow } from '../../lib/useNow'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { CalendarIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { useExerciseMap } from '../exercises/useExerciseMap'
import {
  listFinishedWorkoutsBetween,
  listFinishedWorkoutStarts,
  listWorkoutSummaries,
  listWorkoutSummariesBetween,
  type WorkoutSummary,
} from './historyQueries'
import { SummaryStats } from './SummaryStats'
import { TrainingCalendar } from './TrainingCalendar'
import { WeeklyVolumeCard } from './WeeklyVolumeCard'
import { startOfWeek, weeklyVolumeByMuscle } from './weeklyVolume'

/** Workouts per page: about a month and a half of training. */
const HISTORY_PAGE_SIZE = 20

/**
 * Route /historico. After years of training the history has hundreds of workouts, so
 * nothing here reads all of their sets: the list loads pages ("Carregar mais"), the
 * calendar reads the month it shows and the weekly card reads this week only. The
 * total and the per-month counts come from the workout rows alone (small).
 */
export function HistoryScreen() {
  const { t } = useI18n()
  // Minute precision is enough to know which week it is.
  const now = useNow(60_000)
  const [limit, setLimit] = useState(HISTORY_PAGE_SIZE)
  const [calendarOffset, setCalendarOffset] = useState(0)

  const starts = useLiveQuery(() => listFinishedWorkoutStarts(db), [])
  const summaries = useLiveQuery(() => listWorkoutSummaries(db, limit), [limit])

  const month = monthSpan(now, calendarOffset)
  const monthWorkouts = useLiveQuery(
    () => listFinishedWorkoutsBetween(db, month.start, month.end),
    [month.start, month.end],
  )
  const weekStart = startOfWeek(now)
  const weekSummaries = useLiveQuery(
    () => listWorkoutSummariesBetween(db, weekStart, Number.MAX_SAFE_INTEGER),
    [weekStart],
  )
  const exerciseMap = useExerciseMap()

  let content = <SkeletonList /> // loading
  if (starts && starts.length === 0) {
    content = (
      <EmptyState
        icon={<CalendarIcon />}
        title={t.history.emptyTitle}
        description={t.history.emptyDescription}
      />
    )
  } else if (starts && summaries) {
    content = (
      <div className="flex flex-col gap-4">
        <Link
          to="/historico/resumo"
          className="press flex min-h-12 items-center justify-between gap-3 rounded-sm border-2 border-line bg-surface px-4 py-3 font-display text-xl font-bold uppercase shadow-card active:border-text"
        >
          {t.history.review.open}
          <span aria-hidden="true">→</span>
        </Link>
        <TrainingCalendar
          workouts={monthWorkouts ?? []}
          now={now}
          offset={calendarOffset}
          onOffsetChange={setCalendarOffset}
        />
        {exerciseMap && weekSummaries && (
          <WeeklyVolumeCard
            volumes={weeklyVolumeByMuscle(weekSummaries, exerciseMap, now)}
          >
            <Link
              to="/historico/volume"
              className="flex min-h-12 items-center justify-between gap-3 rounded-sm border-2 border-line-strong px-3 text-sm font-semibold tracking-wide uppercase active:border-text"
            >
              {t.history.trend.open}
              <span aria-hidden="true">→</span>
            </Link>
          </WeeklyVolumeCard>
        )}
        <WorkoutList summaries={summaries} starts={starts} />
        {summaries.length < starts.length && (
          <>
            <p className="text-center text-sm text-muted tabular-nums">
              {t.history.showing(summaries.length, starts.length)}
            </p>
            <Button fullWidth onClick={() => setLimit(limit + HISTORY_PAGE_SIZE)}>
              {t.history.loadMore}
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <ScreenHeader
        title={t.history.title}
        eyebrow={starts?.length ? t.history.count(starts.length) : undefined}
      />
      <div className="px-4 py-6">{content}</div>
    </>
  )
}

/** The loaded workouts, under a heading per month ("novembro de 2026 · 14 treinos"). */
function WorkoutList({
  summaries,
  starts,
}: {
  summaries: WorkoutSummary[]
  /** Every finished workout's start: the month count includes the ones not loaded yet. */
  starts: number[]
}) {
  const { t, format } = useI18n()

  const countByMonth = new Map<string, number>()
  for (const start of starts) {
    const key = monthKey(start)
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1)
  }

  // Already newest first: a new group starts whenever the month changes.
  const groups: Array<{ key: string; summaries: WorkoutSummary[] }> = []
  for (const summary of summaries) {
    const key = monthKey(summary.workout.startedAt)
    const last = groups.at(-1)
    if (last?.key === key) {
      last.summaries.push(summary)
    } else {
      groups.push({ key, summaries: [summary] })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h2 className="flex items-baseline justify-between gap-3 border-b-2 border-line pb-1">
            <span className="font-display text-2xl leading-tight font-bold uppercase">
              {format.monthYear(new Date(group.summaries[0].workout.startedAt))}
            </span>
            <span className="text-sm text-muted tabular-nums">
              {t.history.count(countByMonth.get(group.key) ?? group.summaries.length)}
            </span>
          </h2>
          <ul className="stagger flex flex-col gap-3">
            {group.summaries.map((summary) => (
              <li key={summary.workout.id}>
                <Link
                  to={`/historico/${summary.workout.id}`}
                  className="press flex flex-col gap-3 rounded-sm border-2 border-line bg-surface p-4 shadow-card active:border-text"
                >
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-muted uppercase">
                      {format.workoutDate(summary.workout.startedAt)} ·{' '}
                      {format.time(summary.workout.startedAt)}
                    </p>
                    <h3 className="font-display text-3xl leading-tight font-bold uppercase">
                      {summary.routineName ?? t.workout.freeWorkout}
                    </h3>
                  </div>
                  <SummaryStats summary={summary} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
