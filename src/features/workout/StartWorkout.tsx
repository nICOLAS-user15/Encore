import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { db } from '../../db/db'
import type { ID } from '../../db/types'
import { useI18n } from '../../i18n/context'
import { cn } from '../../lib/cn'
import { formatClock } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { Button } from '../../ui/Button'
import { ConfirmSheet } from '../../ui/ConfirmSheet'
import { EmptyState } from '../../ui/EmptyState'
import { ArrowRightIcon, BarbellIcon } from '../../ui/icons'
import { ScreenHeader } from '../../ui/ScreenHeader'
import { useAction } from '../../ui/toastContext'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import { daysSince, needsBackupReminder } from '../settings/backupReminder'
import { useSettings } from '../settings/useSettings'
import { SplitTabs } from '../splits/SplitTabs'
import { lastRoutineIdInSplit, routinesOfSplit } from '../splits/splitUtils'
import { useSplits } from '../splits/useSplits'
import { startOrSwitchWorkout } from './workoutActions'
import {
  getActiveWorkoutInfo,
  listFinishedWorkouts,
  type ActiveWorkoutInfo,
} from './workoutQueries'
import { suggestNextRoutineId, timerElapsedMs } from './workoutStats'

/**
 * Aba Treino (/treino): a lista para escolher o treino. O treino escolhido abre
 * em /treino/:id, que tem "Voltar" para cá. Se já houver um treino aberto, ele
 * aparece no topo como "Continuar" (e vira a ação principal da tela).
 *
 * As rotinas são organizadas por DIVISÃO (Upper/Lower, PPL...): abas no topo
 * escolhem a divisão, e a lista mostra só as rotinas dela. Cada divisão tem a sua
 * própria sequência, então "próximo da sequência" vale dentro da divisão escolhida.
 */
export function StartWorkout() {
  const { t, format } = useI18n()
  const navigate = useNavigate()
  // Hora atual em estado (atualiza a cada segundo): data do topo e relógio do "Continuar".
  const now = useNow(1000)
  const routines = useLiveQuery(() => listRoutinesWithExercises(db), [])
  const history = useLiveQuery(async () => {
    const finished = await listFinishedWorkouts(db)
    // Do mais recente para o mais antigo: só o que a sequência por divisão precisa.
    return {
      count: finished.length,
      finished: finished.map((workout) => ({ routineId: workout.routineId })),
    }
  }, [])
  // `select` grava a divisão escolhida: vale também na aba Rotinas.
  const { splits, active: currentSplit, select: selectSplit } = useSplits()
  // `loaded`: sem isso, o padrão ("nunca fez backup") faria o aviso piscar ao abrir.
  const { settings, loaded: settingsLoaded } = useSettings()
  const showBackupReminder =
    settingsLoaded &&
    history !== undefined &&
    needsBackupReminder(settings.lastBackupAt, history.count, now)
  const active = useLiveQuery(() => getActiveWorkoutInfo(db), [])
  // Outro treino com séries feitas está aberto: pergunta antes de trocar.
  const [blocked, setBlocked] = useState(false)

  const run = useAction()

  async function start(routineId: ID | null) {
    const result = await run(() => startOrSwitchWorkout(db, routineId))
    if (result === undefined) {
      return
    }
    if (result.status === 'started') {
      navigate(`/treino/${result.workout.id}`)
    } else {
      setBlocked(true)
    }
  }

  const activeName = active ? (active.routineName ?? t.workout.freeWorkout) : ''

  let content = null // carregando
  if (routines && routines.length === 0 && active === null) {
    content = (
      <EmptyState
        icon={<BarbellIcon />}
        title={t.workout.noRoutinesTitle}
        description={t.workout.noRoutinesDescription}
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => void start(null)}>
              {t.workout.freeWorkout}
            </Button>
            <Link
              to="/rotinas"
              className="inline-flex min-h-12 items-center px-1 font-display text-lg font-semibold tracking-wide text-muted uppercase underline underline-offset-4"
            >
              {t.workout.seeRoutines}
            </Link>
          </div>
        }
      />
    )
  } else if (routines && history && splits && active !== undefined) {
    // Com um treino aberto, a ação principal é continuar: a sugestão da sequência
    // perde o vermelho (só um destaque por tela).
    const visible = currentSplit
      ? routinesOfSplit(routines, splits, currentSplit)
      : routines
    const visibleIds = visible.map((entry) => entry.routine.id)
    const nextId = active
      ? null
      : suggestNextRoutineId(
          visibleIds,
          lastRoutineIdInSplit(history.finished, visibleIds),
        )
    content = (
      <div className="flex flex-col gap-3">
        {active && <ContinueCard info={active} name={activeName} now={now} />}

        {/* Com uma divisão só, as abas não ajudam em nada: ficam escondidas. */}
        {splits.length > 1 && (
          <SplitTabs
            splits={splits}
            activeId={currentSplit?.id ?? null}
            onSelect={(splitId) => void selectSplit(splitId)}
          />
        )}
        {currentSplit?.notes && (
          <p className="text-sm text-muted">{currentSplit.notes}</p>
        )}

        <h2 className="text-xs font-semibold tracking-widest text-muted uppercase">
          {t.workout.chooseWorkout}
        </h2>
        {visible.length === 0 && (
          <div className="flex flex-col items-start gap-2 border-2 border-dashed border-line p-4">
            <p className="text-muted">{t.splits.emptySplitWorkout}</p>
            <Link
              to="/rotinas"
              className="inline-flex min-h-12 items-center font-display text-lg font-semibold tracking-wide uppercase underline underline-offset-4"
            >
              {t.splits.addRoutines}
            </Link>
          </div>
        )}
        {visible.map(({ routine, items }) => {
          const isNext = routine.id === nextId
          const isActive = routine.id === active?.workout.routineId
          return (
            <button
              key={routine.id}
              type="button"
              onClick={() => void start(routine.id)}
              className={cn(
                'flex min-h-20 items-center justify-between gap-4 rounded-sm border-2 px-4 py-3 text-left transition active:scale-[0.98]',
                // A próxima da sequência é A ação principal da tela: ganha o acento.
                isNext
                  ? 'border-accent bg-accent active:border-accent-pressed active:bg-accent-pressed'
                  : 'border-line-strong bg-surface active:border-text',
              )}
            >
              <span>
                <span className="block font-display text-3xl leading-none font-bold uppercase">
                  {routine.name}
                </span>
                <span className={cn('text-sm', isNext ? 'text-text' : 'text-muted')}>
                  {t.workout.exerciseCount(items.length)}
                  {isNext && ` · ${t.workout.nextInSequence}`}
                  {isActive && ` · ${t.workout.inProgress}`}
                </span>
              </span>
              <BarbellIcon className="size-7 shrink-0" />
            </button>
          )
        })}
        <Button fullWidth onClick={() => void start(null)} className="mt-2">
          {t.workout.freeWorkout}
        </Button>

        {showBackupReminder && (
          <aside className="mt-4 flex flex-col gap-2 border-l-4 border-text pl-3">
            <p className="text-sm">
              {t.workout.backupReminder(
                settings.lastBackupAt === null
                  ? null
                  : daysSince(settings.lastBackupAt, now),
              )}
            </p>
            <Link
              to="/configuracoes"
              className="inline-flex min-h-12 items-center self-start font-display text-lg font-semibold tracking-wide uppercase underline underline-offset-4"
            >
              {t.workout.backupReminderAction}
            </Link>
          </aside>
        )}
      </div>
    )
  }

  return (
    <>
      <ScreenHeader title={t.workout.title} eyebrow={format.longDate(now)} />
      <div className="px-4 py-6">{content}</div>

      <ConfirmSheet
        open={blocked}
        title={t.routines.activeTitle}
        description={t.routines.activeDescription(activeName)}
        confirmLabel={t.routines.goToWorkout}
        onConfirm={() => active && navigate(`/treino/${active.workout.id}`)}
        onCancel={() => setBlocked(false)}
      />
    </>
  )
}

type ContinueCardProps = {
  info: ActiveWorkoutInfo
  name: string
  now: number
}

/** Cartão do treino aberto, no topo da lista: um toque volta para ele. */
function ContinueCard({ info, name, now }: ContinueCardProps) {
  const { t } = useI18n()
  const { workout } = info
  const elapsed = workout.timerStartedAt === null ? null : timerElapsedMs(workout, now)

  return (
    <Link
      to={`/treino/${workout.id}`}
      aria-label={t.workout.continueTo(name)}
      className="mb-3 flex min-h-20 items-center justify-between gap-4 rounded-sm border-2 border-accent bg-accent px-4 py-3 transition active:scale-[0.98] active:border-accent-pressed active:bg-accent-pressed"
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold tracking-widest uppercase">
          {t.workout.inProgress}
        </span>
        <span className="block truncate font-display text-3xl leading-none font-bold uppercase">
          {name}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 [&>svg]:size-7">
        {elapsed !== null && (
          <span className="font-display text-2xl font-bold tabular-nums">
            {formatClock(elapsed)}
          </span>
        )}
        <span className="font-display text-lg font-semibold uppercase">
          {t.workout.continue}
        </span>
        <ArrowRightIcon />
      </span>
    </Link>
  )
}
