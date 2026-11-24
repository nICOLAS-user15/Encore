import type { Timestamp, Workout } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { localDay, monthGrid, monthSpan } from '../../lib/calendar'
import { Card } from '../../ui/Card'
import { ArrowLeftIcon, ArrowRightIcon } from '../../ui/icons'

type TrainingCalendarProps = {
  /** Finished workouts of the month shown (any order; others are ignored). */
  workouts: Array<Pick<Workout, 'startedAt'>>
  now: Timestamp
  /** Month shown: 0 = this month, -1 = last month... The screen keeps it, to read that month only. */
  offset: number
  onOffsetChange: (offset: number) => void
}

const arrowClasses =
  'flex size-12 items-center justify-center rounded-sm border-2 border-line-strong text-text active:border-text disabled:opacity-30 [&>svg]:size-5'

/**
 * The month at a glance: trained days are filled in (the same inverted look as a
 * completed ✓; the accent stays reserved for records), today has an outline. The days
 * are not buttons: in a 7-column grid on a phone they would be under 48px, and the list
 * below already opens each workout. Arrows go back through the months (never into the future).
 */
export function TrainingCalendar({
  workouts,
  now,
  offset,
  onOffsetChange,
}: TrainingCalendarProps) {
  const { t, format } = useI18n()
  const { year, month, start } = monthSpan(now, offset)
  const shown = new Date(start)

  const trainedDays = new Set(
    workouts.map((workout) => localDay(new Date(workout.startedAt))),
  )
  const monthCount = workouts.filter((workout) => {
    const date = new Date(workout.startedAt)
    return date.getFullYear() === year && date.getMonth() === month
  }).length
  const today = localDay(new Date(now))

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={arrowClasses}
          onClick={() => onOffsetChange(offset - 1)}
          aria-label={t.history.calendar.previousMonth}
        >
          <ArrowLeftIcon />
        </button>
        <div className="min-w-0 text-center">
          <h2 className="truncate font-display text-2xl leading-tight font-bold uppercase">
            {format.monthYear(shown)}
          </h2>
          <p className="text-sm text-muted tabular-nums">
            {t.history.calendar.monthCount(monthCount)}
          </p>
        </div>
        <button
          type="button"
          className={arrowClasses}
          onClick={() => onOffsetChange(offset + 1)}
          disabled={offset >= 0}
          aria-label={t.history.calendar.nextMonth}
        >
          <ArrowRightIcon />
        </button>
      </div>

      <div
        aria-hidden="true"
        className="grid grid-cols-7 gap-1 text-center text-xs text-muted"
      >
        {format.weekdayInitials().map((initial, index) => (
          <span key={index}>{initial}</span>
        ))}
      </div>
      <ol aria-label={t.history.calendar.label} className="grid grid-cols-7 gap-1">
        {monthGrid(year, month).map((date, index) => {
          if (!date) {
            return <li key={`blank-${index}`} aria-hidden="true" />
          }
          const day = localDay(date)
          const trained = trainedDays.has(day)
          return (
            <li
              key={day}
              className={cn(
                'flex h-10 items-center justify-center rounded-sm font-display text-base tabular-nums',
                trained ? 'bg-text font-bold text-background' : 'text-muted',
                day === today && 'border-2 border-text',
              )}
            >
              <span aria-hidden="true">{date.getDate()}</span>
              {trained && (
                <span className="sr-only">
                  {t.history.calendar.trainedDay(format.longDate(date.getTime()))}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
