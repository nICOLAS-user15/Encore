import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { EmptyState } from '../../ui/EmptyState'
import { CalendarIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { listWorkoutSummaries } from './historyQueries'
import { SummaryStats } from './SummaryStats'

export function HistoryScreen() {
  const { t, format } = useI18n()
  const summaries = useLiveQuery(() => listWorkoutSummaries(db), [])

  let content = <SkeletonList /> // loading
  if (summaries && summaries.length === 0) {
    content = (
      <EmptyState
        icon={<CalendarIcon />}
        title={t.history.emptyTitle}
        description={t.history.emptyDescription}
      />
    )
  } else if (summaries) {
    content = (
      <ul className="stagger flex flex-col gap-3">
        {summaries.map((summary) => (
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
                <h2 className="font-display text-3xl leading-tight font-bold uppercase">
                  {summary.routineName ?? t.workout.freeWorkout}
                </h2>
              </div>
              <SummaryStats summary={summary} />
            </Link>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      <ScreenHeader
        title={t.history.title}
        eyebrow={summaries?.length ? t.history.count(summaries.length) : undefined}
      />
      <div className="px-4 py-6">{content}</div>
    </>
  )
}
