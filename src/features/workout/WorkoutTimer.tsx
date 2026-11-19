import { db } from '../../db/db'
import type { Workout } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { formatClock } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { Button } from '../../ui/Button'
import { useAction } from '../../ui/toastContext'
import {
  pauseWorkoutTimer,
  resumeWorkoutTimer,
  startWorkoutTimer,
} from './workoutActions'
import { timerElapsedMs } from './workoutStats'

type TimerState = 'notStarted' | 'running' | 'paused' | 'stopped'

function timerState(workout: Workout): TimerState {
  if (workout.timerStartedAt === null) {
    return 'notStarted'
  }
  if (workout.timerStoppedAt !== null) {
    return 'stopped'
  }
  return workout.timerPausedAt ? 'paused' : 'running'
}

type WorkoutTimerProps = {
  workout: Workout
  /** "Iniciar" é a ação principal da tela agora? (vermelho só quando for). */
  emphasizeStart: boolean
  /** Começa um descanso manualmente (botão "Descansar", só antes de iniciar). */
  onRest: () => void
  /** "Finalizar treino" é a ação principal agora? (vermelho só com série concluída). */
  emphasizeFinish: boolean
  /** Pede para finalizar o treino (a tela abre a confirmação). */
  onFinish: () => void
}

/**
 * Cronômetro do treino controlado pelo usuário: começa parado e "Iniciar" liga.
 * Depois de iniciado, o card mostra "Pausar"/"Retomar" (ir ao banheiro, atender
 * alguém) ao lado de "Finalizar treino" (que também para o cronômetro): o descanso
 * já começa sozinho ao concluir uma série. O tempo é sempre calculado pelos
 * horários salvos, então continua certo mesmo com a tela apagada.
 */
export function WorkoutTimer({
  workout,
  emphasizeStart,
  onRest,
  emphasizeFinish,
  onFinish,
}: WorkoutTimerProps) {
  const { t } = useI18n()
  const now = useNow(1000)
  const run = useAction()

  const state = timerState(workout)
  const elapsed = timerElapsedMs(workout, now)

  const labels = {
    notStarted: t.workout.timer.notStarted,
    running: t.workout.timer.running,
    paused: t.workout.timer.paused,
    stopped: t.workout.timer.stopped,
  }

  return (
    <section
      aria-label={t.workout.timer.label}
      className="flex flex-col gap-3 rounded-sm border-2 border-line bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">
          {labels[state]}
        </p>
        <p
          role="timer"
          className={cn(
            'font-display text-5xl leading-none font-bold tabular-nums',
            (state === 'notStarted' || state === 'paused') && 'text-muted',
          )}
        >
          {formatClock(elapsed)}
        </p>
      </div>
      {state === 'notStarted' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={emphasizeStart ? 'primary' : 'secondary'}
            onClick={() => void run(() => startWorkoutTimer(db, workout.id))}
          >
            {t.workout.timer.start}
          </Button>
          <Button onClick={onRest}>{t.workout.timer.rest}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {/* Treino com o cronômetro já parado (versões antigas): só o "Finalizar". */}
          {state === 'running' && (
            <Button
              variant="secondary"
              onClick={() => void run(() => pauseWorkoutTimer(db, workout.id))}
            >
              {t.workout.timer.pause}
            </Button>
          )}
          {state === 'paused' && (
            <Button
              variant="secondary"
              onClick={() => void run(() => resumeWorkoutTimer(db, workout.id))}
            >
              {t.workout.timer.resume}
            </Button>
          )}
          <Button
            variant={emphasizeFinish ? 'primary' : 'secondary'}
            className={cn(state === 'stopped' && 'col-span-2')}
            onClick={onFinish}
          >
            {t.workout.finish}
          </Button>
        </div>
      )}
    </section>
  )
}
