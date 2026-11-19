import { Link } from 'react-router'
import { useI18n } from '../../i18n/context'
import { formatClock } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { DockItem } from '../../ui/BottomDock'
import { ArrowRightIcon } from '../../ui/icons'
import type { ActiveWorkoutInfo } from './workoutQueries'
import { timerElapsedMs } from './workoutStats'

/**
 * Faixa "Treino em andamento" na doca, para quando o usuário sai da aba Treino
 * no meio do treino (ex.: para olhar o Histórico). Tocar nela volta ao treino.
 */
export function ActiveWorkoutBanner({ info }: { info: ActiveWorkoutInfo }) {
  const { t } = useI18n()
  const now = useNow(1000)
  const { workout, routineName } = info
  const name = routineName ?? t.workout.freeWorkout

  // Mostra o cronômetro só se o usuário o iniciou (mesma regra da tela do treino).
  const elapsed = workout.timerStartedAt === null ? null : timerElapsedMs(workout, now)

  return (
    <DockItem>
      <Link
        to={`/treino/${workout.id}`}
        aria-label={t.workout.backToWorkout(name)}
        className="flex items-center justify-between gap-3 border-2 border-text bg-surface p-3 active:bg-background"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold tracking-widest text-muted uppercase">
            {t.workout.inProgress}
          </span>
          <span className="block truncate font-display text-2xl leading-tight font-bold uppercase">
            {name}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3 [&>svg]:size-6">
          {elapsed !== null && (
            <span className="font-display text-3xl font-bold tabular-nums">
              {formatClock(elapsed)}
            </span>
          )}
          <ArrowRightIcon />
        </span>
      </Link>
    </DockItem>
  )
}
