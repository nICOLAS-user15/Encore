import { useState } from 'react'
import type { SetEntry } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { CheckIcon } from '../../ui/icons'
import { RecordBadge } from '../records/RecordBadge'

type SetRowProps = {
  set: SetEntry
  /** Label on the left: set number (1, 2, 3...) or "AQ" for warm-up. */
  label: number | string
  /** Exercise name, only for the button's accessible name. */
  exerciseName: string
  /** It is the next set to do ("where I am"): gets a light border. */
  isNext: boolean
  /** The set is a personal record (beats everything done before it). */
  isRecord?: boolean
  /** The same set last time (`previousSetsById`): shown under the numbers as the mark to beat. */
  previous?: Pick<SetEntry, 'weightKg' | 'reps'>
  onEdit: () => void
  onToggle: () => void
}

/**
 * A set: tapping the row opens the editor; tapping the ✓ completes it (or undoes it).
 * Both targets are large and separate so you do not miss with a sweaty hand.
 *
 * Three visual states, no new color: next (light border), pending (dark
 * border) and completed (inverted ✓, dimmed numbers: already left behind).
 */
export function SetRow({
  set,
  label,
  exerciseName,
  isNext,
  isRecord = false,
  previous,
  onEdit,
  onToggle,
}: SetRowProps) {
  const { t, format } = useI18n()
  const completed = set.completedAt !== null
  const warmup = set.type === 'warmup'
  // The ✓ "stamps" only when the user has just tapped it, and not every time that
  // a completed set appears on screen (e.g. when returning to the workout).
  const [justTapped, setJustTapped] = useState(false)

  function handleToggle() {
    setJustTapped(!completed)
    onToggle()
  }

  return (
    // aria-current="step": screen readers announce "current step".
    <li className="flex items-stretch gap-2" aria-current={isNext ? 'step' : undefined}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={t.workout.editSet(
          label,
          // "recorde pessoal" stays at the END of the name (screen readers and tests rely on it).
          `${exerciseName}, ${format.set(set.weightKg, set.reps)}${previous ? `, ${t.workout.previousSetLabel(format.set(previous.weightKg, previous.reps))}` : ''}${isRecord ? `, ${t.records.personalRecord}` : ''}`,
        )}
        className={cn(
          // transition-colors: the "next" highlight moves from one set to the other smoothly.
          'flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-sm border-2 bg-background px-3 text-left transition-colors duration-200 active:border-text',
          isNext ? 'border-text' : 'border-line-strong',
        )}
      >
        <span className="w-6 shrink-0 font-display text-lg font-semibold text-muted tabular-nums">
          {label}
        </span>
        <span className="flex min-w-0 flex-col">
          <span
            className={cn(
              'font-display leading-tight font-bold tabular-nums',
              // Smaller warm-up: the eye goes straight to the working sets.
              warmup ? 'text-xl' : 'text-2xl',
              // Warm-up and completed sets in a dimmed tone.
              (warmup || completed) && 'text-muted',
            )}
          >
            {format.decimal(set.weightKg)}
            <span className="text-base font-semibold text-muted"> {t.common.kg}</span>
            <span className="text-muted"> × </span>
            {set.reps}
          </span>
          {previous && (
            <span className="text-xs text-muted tabular-nums">
              {t.workout.previousSet(format.set(previous.weightKg, previous.reps))}
            </span>
          )}
        </span>
        {(isRecord || set.type === 'encore') && (
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {isRecord && <RecordBadge />}
            {set.type === 'encore' && (
              <span className="border-2 border-line px-1.5 text-xs font-bold tracking-wider text-muted uppercase">
                {t.workout.encore}
              </span>
            )}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={completed}
        aria-label={completed ? t.workout.undoSet(label) : t.workout.completeSet(label)}
        className={cn(
          // active:scale-90: the button sinks under the finger (confirms the tap registered).
          'flex size-14 shrink-0 items-center justify-center rounded-sm border-2 transition-transform duration-75 active:scale-90 [&>svg]:size-7',
          // The class is added when the set becomes "completed" after the tap: stamps once.
          completed && justTapped && 'animate-stamp',
          // Completed = inverted colors. No accent: it is reserved for PRs.
          completed && 'border-text bg-text text-background',
          // Next: ✓ with light border and icon, inviting the tap.
          !completed &&
            (isNext ? 'border-text text-text' : 'border-line-strong text-muted'),
        )}
      >
        <CheckIcon />
      </button>
    </li>
  )
}
