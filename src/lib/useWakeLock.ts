import { useEffect } from 'react'

/**
 * Mantém a tela ligada enquanto `enabled` for true (Screen Wake Lock API).
 *
 * - O sistema solta o bloqueio sozinho quando o app vai para segundo plano;
 *   por isso pedimos de novo quando o app volta a ficar visível.
 * - Navegadores sem suporte (ou que negam o pedido) simplesmente seguem sem
 *   ele: a tela apaga como sempre, e nada quebra.
 */
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) {
      return
    }

    let sentinel: WakeLockSentinel | null = null
    let active = true

    async function request() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        // Se o componente saiu da tela enquanto o pedido estava em andamento, solta.
        if (!active) {
          await lock.release()
          return
        }
        sentinel = lock
      } catch {
        // Negado (bateria fraca, aba em segundo plano...): segue sem bloqueio.
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void request()
      }
    }

    void request()
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Limpeza: treino acabou, opção desligada ou tela fechada.
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void sentinel?.release()
    }
  }, [enabled])
}
