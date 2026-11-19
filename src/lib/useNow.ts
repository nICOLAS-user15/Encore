import { useEffect, useState } from 'react'

/**
 * Devolve `Date.now()` e faz o componente renderizar de novo a cada `intervalMs`.
 * Útil para cronômetros: o tempo exibido é sempre calculado a partir de um
 * horário guardado (ex.: `startedAt`), nunca contando "ticks". Assim, se o
 * celular pausar o JavaScript com a tela apagada, o tempo continua certo.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    // Limpeza: para o intervalo quando o componente sai da tela.
    return () => window.clearInterval(id)
  }, [intervalMs])

  return now
}
