import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { Card } from '../../ui/Card'
import { compareWorkouts } from './compareWorkouts'
import { getPreviousSummary, type WorkoutSummary } from './historyQueries'

/** "+120", "−5" ou "=" (sem mudança). Usa o sinal de menos tipográfico (−). */
function signed(value: number, text: (absolute: number) => string): string {
  if (value === 0) {
    return '='
  }
  return `${value > 0 ? '+' : '−'}${text(Math.abs(value))}`
}

/**
 * Comparação com a vez anterior da mesma rotina, no detalhe do treino.
 * Some quando não há com o que comparar (primeira vez ou treino livre).
 */
export function ComparisonCard({ summary }: { summary: WorkoutSummary }) {
  const { t, format } = useI18n()
  const previous = useLiveQuery(
    () => getPreviousSummary(db, summary.workout),
    [summary.workout.id, summary.workout.startedAt, summary.workout.routineId],
  )

  if (!previous) {
    return null
  }
  const diff = compareWorkouts(summary, previous)

  return (
    <Card>
      <p className="mb-2 text-xs font-semibold tracking-widest text-muted uppercase">
        {t.history.comparedTo(
          previous.routineName ?? t.workout.freeWorkout,
          format.workoutDate(previous.workout.startedAt),
        )}
      </p>
      <dl className="grid grid-cols-3 gap-3">
        <Delta
          label={t.history.volume}
          value={signed(diff.volumeKg, (kg) => format.volume(kg))}
        />
        <Delta label={t.history.sets} value={signed(diff.sets, String)} />
        <Delta
          label={t.history.duration}
          value={signed(diff.durationMin, (min) => t.history.minutes(min))}
        />
      </dl>
    </Card>
  )
}

function Delta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-widest text-muted uppercase">
        {label}
      </dt>
      <dd className="truncate font-display text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
