import { useState } from 'react'

// A duração do descanso vem das Configurações (settings.restSeconds).

const STORAGE_KEY = 'encore:restEndsAt'

/*
 * O fim do descanso fica no localStorage para sobreviver a trocar de aba ou
 * fechar o app. É só uma conveniência: se o navegador bloquear o storage,
 * o timer continua funcionando enquanto a tela estiver aberta.
 */
function readStored(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    // Descanso que já acabou (o app estava fechado): some, em vez de apitar atrasado.
    if (!value || value <= Date.now()) {
      return null
    }
    return value
  } catch {
    return null
  }
}

function writeStored(value: number | null): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, String(value))
    }
  } catch {
    // Sem storage disponível: segue só com o estado em memória.
  }
}

export type RestTimerControls = {
  /** Horário (ms) em que o descanso acaba, ou `null` se não há descanso. */
  endsAt: number | null
  start: (seconds: number) => void
  add: (seconds: number) => void
  stop: () => void
}

export function useRestTimer(): RestTimerControls {
  const [endsAt, setEndsAtState] = useState<number | null>(readStored)

  function setEndsAt(value: number | null) {
    writeStored(value)
    setEndsAtState(value)
  }

  return {
    endsAt,
    start: (seconds) => setEndsAt(Date.now() + seconds * 1000),
    // Se o descanso já acabou, os +15s contam a partir de agora.
    add: (seconds) => setEndsAt(Math.max(Date.now(), endsAt ?? 0) + seconds * 1000),
    stop: () => setEndsAt(null),
  }
}
