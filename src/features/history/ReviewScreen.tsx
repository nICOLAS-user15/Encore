import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { monthSpan, yearSpan } from '../../lib/calendar'
import { cn } from '../../lib/cn'
import { useNow } from '../../lib/useNow'
import { AnimatedNumber } from '../../ui/AnimatedNumber'
import { Card } from '../../ui/Card'
import { ArrowLeftIcon, ArrowRightIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { SkeletonList } from '../../ui/Skeleton'
import { useExerciseMap } from '../exercises/useExerciseMap'
import { RecordBadge } from '../records/RecordBadge'
import { getPeriodWorkouts } from './reviewQueries'
import { reviewOf } from './reviewStats'

type Scope = 'month' | 'year'

const HOUR_MS = 60 * 60 * 1000

const arrowClasses =
  'flex size-12 items-center justify-center rounded-sm border-2 border-line-strong text-text active:border-text disabled:opacity-30 [&>svg]:size-5'

/**
 * Route /historico/resumo: a month or a year in numbers (workouts, time, sets, volume,
 * frequency, records) and two highlights: the exercise that improved the most and the
 * one done the most. Arrows go back through the periods, never into the future.
 */
export function ReviewScreen() {
  const { t, format, exerciseName } = useI18n()
  const now = useNow(60_000)
  const [scope, setScope] = useState<Scope>('month')
  // 0 = this month/year, -1 = the one before...
  const [offset, setOffset] = useState(0)

  const span = scope === 'month' ? monthSpan(now, offset) : yearSpan(now, offset)
  const title =
    scope === 'month' ? format.monthYear(new Date(span.start)) : String(span.year)
  const data = useLiveQuery(
    () => getPeriodWorkouts(db, span.start, span.end),
    [span.start, span.end],
  )
  const exerciseMap = useExerciseMap()

  function changeScope(next: Scope) {
    setScope(next)
    setOffset(0)
  }

  let content = <SkeletonList />
  if (data && exerciseMap) {
    const review = reviewOf(data.summaries, span, now)
    const nameOf = (id: string) => exerciseName(exerciseMap.get(id))
    content =
      review.workouts === 0 ? (
        <p className="text-sm text-muted">{t.history.review.empty}</p>
      ) : (
        <div className="stagger flex flex-col gap-4">
          <Card>
            <dl className="grid grid-cols-2 gap-4">
              <Stat label={t.history.review.workouts}>
                <AnimatedNumber value={review.workouts} format={String} />
              </Stat>
              <Stat label={t.history.review.time}>
                {t.history.review.hours(Math.round(review.durationMs / HOUR_MS))}
              </Stat>
              <Stat label={t.history.sets}>
                <AnimatedNumber value={review.sets} format={String} />
              </Stat>
              <Stat label={t.history.volume}>
                <AnimatedNumber value={review.volumeKg} format={format.volume} />
              </Stat>
              <Stat label={t.history.review.perWeek}>
                {format.decimal(review.perWeek)}
              </Stat>
              <Stat label={t.history.review.records}>
                <span className="flex items-center gap-2">
                  {data.records}
                  {data.records > 0 && <RecordBadge />}
                </span>
              </Stat>
            </dl>
          </Card>
          {review.mostImproved && (
            <Highlight label={t.history.review.mostImproved}>
              {nameOf(review.mostImproved.exerciseId)}
              <span className="text-muted"> · +{review.mostImproved.percent}%</span>
            </Highlight>
          )}
          {review.mostDone && (
            <Highlight label={t.history.review.mostDone}>
              {nameOf(review.mostDone.exerciseId)}
              <span className="text-muted">
                {' '}
                · {t.history.review.sessions(review.mostDone.sessions)}
              </span>
            </Highlight>
          )}
        </div>
      )
  }

  return (
    <>
      <ScreenHeader title={t.history.review.title} />
      <div className="flex flex-col gap-4 px-4 py-6">
        <div
          role="group"
          aria-label={t.history.review.scope}
          className="grid grid-cols-2 gap-1"
        >
          {(['month', 'year'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={scope === option}
              onClick={() => changeScope(option)}
              className={cn(
                'min-h-12 rounded-sm border-2 font-display text-lg font-semibold uppercase',
                scope === option
                  ? 'border-text bg-text text-background'
                  : 'border-line-strong text-muted',
              )}
            >
              {option === 'month' ? t.history.review.month : t.history.review.year}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className={arrowClasses}
            onClick={() => setOffset(offset - 1)}
            aria-label={t.history.review.previous}
          >
            <ArrowLeftIcon />
          </button>
          <h2 className="truncate font-display text-2xl leading-tight font-bold uppercase">
            {title}
          </h2>
          <button
            type="button"
            className={arrowClasses}
            onClick={() => setOffset(offset + 1)}
            disabled={offset >= 0}
            aria-label={t.history.review.next}
          >
            <ArrowRightIcon />
          </button>
        </div>
        {content}
      </div>
    </>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </dt>
      <dd className="truncate font-display text-3xl font-bold tabular-nums">
        {children}
      </dd>
    </div>
  )
}

function Highlight({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </p>
      <p className="font-display text-xl font-bold">{children}</p>
    </Card>
  )
}
