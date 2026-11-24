import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { RIR_OPTIONS } from './workoutStats'

type RirPickerProps = {
  /** Selected value; `null` = not logged. */
  value: number | null
  /** Tapping the selected value again clears it (`null`): logging is optional. */
  onChange: (rir: number | null) => void
}

/**
 * Reps in reserve: four 48px buttons (0, 1, 2, 3+). Used on the rest bar, right after a
 * set is completed (the hand is free), and in the set editor.
 */
export function RirPicker({ value, onChange }: RirPickerProps) {
  const { t } = useI18n()
  return (
    <div role="group" aria-label={t.workout.rir.question} className="flex flex-col gap-1">
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">
        {t.workout.rir.question}
      </p>
      <div className="grid grid-cols-4 gap-1">
        {RIR_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            aria-label={t.workout.rir.value(option)}
            onClick={() => onChange(value === option ? null : option)}
            className={cn(
              'min-h-12 rounded-sm border-2 font-display text-lg font-semibold tabular-nums',
              // Selected = inverted (no accent: it is not the screen's main action).
              value === option
                ? 'border-text bg-text text-background'
                : 'border-line-strong text-muted',
            )}
          >
            {option === RIR_OPTIONS.at(-1) ? `${option}+` : option}
          </button>
        ))}
      </div>
    </div>
  )
}
