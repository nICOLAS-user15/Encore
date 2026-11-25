import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { useNow } from '../../lib/useNow'
import { Card } from '../../ui/Card'
import { EmptyState } from '../../ui/EmptyState'
import { CalendarIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { listWorkoutSummariesBetween } from './historyQueries'
import {
  TREND_WEEKS,
  weeklySetsByMuscle,
  weekStartsBack,
  type MuscleTrend,
} from './weeklyVolume'

/** The usual hypertrophy range of sets per muscle per week (the reference lines). */
const REFERENCE_MIN = 10
const REFERENCE_MAX = 20

/**
 * Route /historico/volume: sets per muscle group over the last 8 weeks. Shows what one
 * week cannot: a muscle that is always under 10 sets, or one that crept past 20.
 * Reads only those 8 weeks of workouts.
 */
export function VolumeTrendScreen() {
  const { t } = useI18n()
  // Minute precision is enough to know which week it is.
  const now = useNow(60_000)
  const from = weekStartsBack(now, TREND_WEEKS)[0]
  const summaries = useLiveQuery(
    () => listWorkoutSummariesBetween(db, from, Number.MAX_SAFE_INTEGER),
    [from],
  )
  const exerciseMap = useExerciseMap()

  let content = <SkeletonList />
  if (summaries && exerciseMap) {
    const trends = weeklySetsByMuscle(summaries, exerciseMap, now)
    content =
      trends.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          title={t.history.trend.emptyTitle}
          description={t.history.trend.emptyDescription}
        />
      ) : (
        <ul aria-label={t.history.trend.title} className="stagger flex flex-col gap-3">
          {trends.map((trend) => (
            <li key={trend.muscleGroup}>
              <TrendRow trend={trend} />
            </li>
          ))}
        </ul>
      )
  }

  return (
    <>
      <ScreenHeader title={t.history.trend.title} />
      <div className="flex flex-col gap-4 px-4 py-6">
        <p className="text-sm text-muted">
          {t.history.trend.hint(REFERENCE_MIN, REFERENCE_MAX)}
        </p>
        {content}
      </div>
    </>
  )
}

/**
 * One muscle: name, average and 8 bars (one per week; the last, this week so far, is
 * dimmed). Two dashed lines mark 10 and 20 sets. The scale fits 20 or the biggest week.
 */
function TrendRow({ trend }: { trend: MuscleTrend }) {
  const { t, format } = useI18n()
  const name = t.muscleGroups[trend.muscleGroup]
  const scale = Math.max(REFERENCE_MAX, ...trend.sets)
  const height = (sets: number) => `${(sets / scale) * 100}%`

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl leading-tight font-bold uppercase">
          {name}
        </h2>
        <p className="text-sm text-muted tabular-nums">
          {t.history.trend.average(format.decimal(trend.average))}
        </p>
      </div>
      <div
        role="img"
        aria-label={t.history.trend.summary(name, trend.sets.join(', '))}
        className="relative flex h-20 items-end gap-1"
      >
        {[REFERENCE_MIN, REFERENCE_MAX].map((line) => (
          <div
            key={line}
            aria-hidden="true"
            className="absolute inset-x-0 border-t border-dashed border-line-strong"
            style={{ bottom: height(line) }}
          />
        ))}
        {trend.sets.map((sets, index) => (
          <div
            // A fixed list of 8 weeks: the index is the week.
            key={index}
            className={cn(
              'flex-1 rounded-sm',
              index === trend.sets.length - 1 ? 'bg-muted' : 'bg-text',
            )}
            style={{ height: sets === 0 ? '2px' : height(sets) }}
          />
        ))}
      </div>
      <p aria-hidden="true" className="flex justify-between text-xs text-muted">
        <span>{t.history.trend.weeksAgo(TREND_WEEKS - 1)}</span>
        <span>{t.history.trend.thisWeek}</span>
      </p>
    </Card>
  )
}
