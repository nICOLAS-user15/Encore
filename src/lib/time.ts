import type { Timestamp } from '../db/types'

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Cronômetro: 83_000 ms -> "1:23" | 3_725_000 ms -> "1:02:05".
 * Valores negativos viram "0:00".
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

/** Contagem regressiva: arredonda para cima, então 89,2 s ainda mostra "1:30". */
export function formatCountdown(ms: number): string {
  return formatClock(Math.ceil(ms / 1000) * 1000)
}

/**
 * TODO (exercício 3): duração de um treino, em texto, para o Histórico.
 *
 * A versão abaixo é um placeholder que só mostra minutos ("75 min").
 * Implemente o formato completo:
 *   - menos de 1 hora:  "0 min", "45 min"
 *   - 1 hora ou mais:   "1h 05min", "2h 00min" (minutos sempre com 2 dígitos)
 *   - sempre arredondando PARA BAIXO para minutos inteiros (59,9 s -> "0 min")
 *
 * Dicas: `Math.floor`, o operador `%` (resto da divisão) e o `pad` lá em cima.
 * Testes prontos em `time.test.ts`: troque `describe.skip` por `describe`.
 */
export function formatDuration(ms: number): string {
  return `${Math.floor(ms / 60_000)} min`
}

/** Data curta do treino. pt-BR: "seg., 18 de nov." | en-US: "Mon, Nov 18" */
export function formatWorkoutDate(timestamp: Timestamp, locale = 'pt-BR'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Data por extenso. pt-BR: "segunda-feira, 18 de novembro" */
export function formatLongDate(timestamp: Timestamp, locale = 'pt-BR'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Hora. pt-BR: "18:42" | en-US: "06:42 PM" */
export function formatTime(timestamp: Timestamp, locale = 'pt-BR'): string {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}
