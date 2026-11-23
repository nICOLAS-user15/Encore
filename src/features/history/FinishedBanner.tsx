import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { useI18n } from '../../i18n/context'
import { Button } from '../../ui/Button'
import { volumeChangePercent } from './compareWorkouts'
import { getPreviousSummary, type WorkoutSummary } from './historyQueries'

/**
 * Post-workout summary: the top of the workout detail right after "Finalizar treino".
 * One headline (volume against last time, or "first time") and "Pronto", the screen's
 * only red button, back to the Workout tab. The numbers, records and comparison stay
 * in the cards below it; this is the moment of "done", not another table.
 */
export function FinishedBanner({ summary }: { summary: WorkoutSummary }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const previous = useLiveQuery(
    () => getPreviousSummary(db, summary.workout),
    [summary.workout.id, summary.workout.startedAt, summary.workout.routineId],
  )

  let headline: string | null = null
  if (previous) {
    const percent = volumeChangePercent(summary, previous)
    headline = percent === null ? null : t.history.finished.volumeChange(percent)
  } else if (previous === null && summary.workout.routineId !== null) {
    headline = t.history.finished.firstTime
  }

  return (
    <section
      aria-labelledby="finished-title"
      className="flex flex-col gap-3 rounded-sm border-2 border-line-strong bg-surface p-4 shadow-card"
    >
      <h2
        id="finished-title"
        className="font-display text-4xl leading-none font-bold uppercase"
      >
        {t.history.finished.title}
      </h2>
      {headline && <p className="text-lg">{headline}</p>}
      <Button variant="primary" fullWidth onClick={() => void navigate('/treino')}>
        {t.common.done}
      </Button>
    </section>
  )
}
