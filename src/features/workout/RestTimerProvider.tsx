import type { ReactNode } from 'react'
import { useSettings } from '../settings/useSettings'
import { RestTimerContext } from './restContext'
import { RestTimer } from './RestTimer'
import { useRestTimer } from './useRestTimer'

/*
 * O descanso mora ACIMA das telas (no AppLayout), não dentro do treino: se o usuário
 * for ao Histórico ou às Configurações no meio do descanso, a barra continua na doca e
 * o aviso de fim (bipe e vibração) acontece no momento certo, em qualquer tela.
 */

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const rest = useRestTimer()
  const { settings } = useSettings()

  return (
    <RestTimerContext value={rest}>
      {children}
      {rest.endsAt !== null && (
        <RestTimer
          endsAt={rest.endsAt}
          sound={settings.restSound}
          onAdd={() => rest.add(15)}
          onDismiss={rest.stop}
        />
      )}
    </RestTimerContext>
  )
}
