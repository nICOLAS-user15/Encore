import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import type { WeeklyGoalProgress } from './weeklyGoal'

/**
 * "This week · 2 of 3 workouts" with one segment per workout of the goal, and the streak
 * of weeks on target. Filled segments use the text color (like a completed ✓): the accent
 * stays for the screen's main action and for records.
 */
export function WeeklyGoalCard({ progress }: { progress: WeeklyGoalProgress }) {
  const { t } = useI18n()
  const { done, goal, streakWeeks } = progress

  return (
    <section aria-label={t.workout.weeklyGoal.label} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
          {t.workout.weeklyGoal.thisWeek}
        </h2>
        <p className="font-display text-xl font-bold tabular-nums">
          {t.workout.weeklyGoal.progress(done, goal)}
        </p>
      </div>
      <div
        aria-hidden="true"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${goal}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: goal }, (_, index) => (
          <div
            key={index}
            className={cn('h-1.5 rounded-sm', index < done ? 'bg-text' : 'bg-line')}
          />
        ))}
      </div>
      {streakWeeks > 0 && (
        <p className="text-sm text-muted">{t.workout.weeklyGoal.streak(streakWeeks)}</p>
      )}
    </section>
  )
}
