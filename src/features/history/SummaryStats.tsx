import type { ReactNode } from 'react'
import { useI18n } from '../../i18n/context'
import { formatDuration } from '../../lib/time'
import { AnimatedNumber } from '../../ui/AnimatedNumber'
import {
  completedWorkingSets,
  totalVolumeKg,
  workoutDurationMs,
} from '../workout/workoutStats'
import type { WorkoutSummary } from './historyQueries'

/** Three workout numbers: duration, completed sets and volume. */
export function SummaryStats({ summary }: { summary: WorkoutSummary }) {
  const { t, format } = useI18n()
  const { workout, sets } = summary

  return (
    <dl className="grid grid-cols-3 gap-3">
      <Stat
        label={t.history.duration}
        value={formatDuration(workoutDurationMs(workout))}
      />
      <Stat
        label={t.history.sets}
        value={
          <AnimatedNumber value={completedWorkingSets(sets).length} format={String} />
        }
      />
      <Stat
        label={t.history.volume}
        value={<AnimatedNumber value={totalVolumeKg(sets)} format={format.volume} />}
      />
    </dl>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </dt>
      <dd className="truncate font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
