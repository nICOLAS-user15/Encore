import { useI18n } from '../../i18n/context'

type WorkoutProgressProps = {
  /** Working sets completed (warm-up does not count). */
  done: number
  /** Working sets planned + added (warm-up does not count). */
  total: number
}

/**
 * Thin bar under the header: how much of the workout is done. It is the screen's "light":
 * it grows as the sets are completed, so progress can be seen at a glance, mid-set.
 */
export function WorkoutProgress({ done, total }: WorkoutProgressProps) {
  const { t } = useI18n()
  if (total === 0) {
    return null
  }
  const percent = Math.min(100, Math.round((done / total) * 100))
  return (
    <div
      role="progressbar"
      aria-label={t.workout.progress(done, total)}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="h-1 bg-line"
    >
      <div
        className="h-full bg-accent-bright shadow-glow transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
