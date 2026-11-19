import { useEffect, useRef } from 'react'
import { useI18n } from '../../i18n/context'
import { playRestBeep } from '../../lib/beep'
import { cn } from '../../lib/cn'
import { formatCountdown } from '../../lib/time'
import { useNow } from '../../lib/useNow'
import { DockItem } from '../../ui/BottomDock'
import { Button } from '../../ui/Button'

type RestTimerProps = {
  endsAt: number
  /** Tocar o bipe quando o descanso acabar (opção das Configurações). */
  sound: boolean
  onAdd: () => void
  onDismiss: () => void
}

/** Barra de descanso, na doca acima das abas. */
export function RestTimer({ endsAt, sound, onAdd, onDismiss }: RestTimerProps) {
  const { t } = useI18n()
  const now = useNow(250)
  const remaining = endsAt - now
  const finished = remaining <= 0

  // Só avisa na passagem de "contando" para "acabou" que aconteceu com a barra na tela:
  // uma barra que já nasce acabada (ex.: reabrir o app) não apita fora de hora.
  const armed = useRef(false)
  useEffect(() => {
    if (!finished) {
      armed.current = true
      return
    }
    if (armed.current) {
      armed.current = false
      // Vibra no Android. O iPhone não tem essa API, então `?.` evita o erro.
      navigator.vibrate?.([200, 100, 200])
      if (sound) {
        playRestBeep()
      }
    }
  }, [finished, sound])

  return (
    <DockItem>
      {/* Duas camadas: a de fora sobe da doca ao aparecer; a de dentro dá o tranco no fim. */}
      <div>
        {/* O timer em si não é anunciado a cada segundo; só o fim, para leitor de tela. */}
        <p role="status" className="sr-only">
          {finished ? t.workout.rest.over : ''}
        </p>
        <div
          role="timer"
          aria-label={t.workout.rest.label}
          className={cn(
            'flex items-center justify-between gap-3 border-2 border-text bg-surface p-3',
            // A classe só entra quando acaba: a animação roda uma vez nesse momento.
            finished && 'animate-nudge',
          )}
        >
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">
              {finished ? t.workout.rest.over : t.workout.rest.label}
            </p>
            <p className="font-display text-4xl leading-none font-bold tabular-nums">
              {finished ? t.workout.rest.go : formatCountdown(remaining)}
            </p>
          </div>
          <div className="flex gap-2">
            {!finished && <Button onClick={onAdd}>{t.workout.rest.add15}</Button>}
            <Button variant={finished ? 'secondary' : 'ghost'} onClick={onDismiss}>
              {finished ? t.workout.rest.ok : t.workout.rest.skip}
            </Button>
          </div>
        </div>
      </div>
    </DockItem>
  )
}
