import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { DockItem } from './BottomDock'
import { ToastContext, type ToastApi } from './toastContext'

/*
 * Aviso rápido na doca, com ação opcional ("Desfazer"). Serve a dois usos:
 * - desfazer uma exclusão (toda exclusão do app é lógica, então voltar é só limpar `deletedAt`);
 * - dizer que uma gravação falhou (ex.: disco cheio), em vez de falhar em silêncio.
 * Um aviso por vez: o mais novo substitui o anterior.
 */

type ToastData = {
  id: number
  message: string
  /** Texto e ação do botão (ex.: "Desfazer"). */
  action?: { label: string; run: () => void }
  tone: 'info' | 'error'
}

const UNDO_MS = 6_000
const ERROR_MS = 8_000

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [toast, setToast] = useState<ToastData | null>(null)

  const showUndo = useCallback<ToastApi['showUndo']>(
    (message, undo) =>
      setToast({
        id: Date.now(),
        message,
        tone: 'info',
        action: {
          label: t.common.undo,
          run: () => void Promise.resolve(undo()).catch(() => undefined),
        },
      }),
    [t],
  )
  const showError = useCallback<ToastApi['showError']>(
    (message) => setToast({ id: Date.now(), message, tone: 'error' }),
    [],
  )

  // Some sozinho. `id` no efeito: um aviso novo reinicia a contagem.
  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = setTimeout(
      () => setToast(null),
      toast.tone === 'error' ? ERROR_MS : UNDO_MS,
    )
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext value={{ showUndo, showError }}>
      {children}
      {toast && (
        <DockItem>
          {/* role="status": leitores de tela anunciam o aviso sem tirar o foco. */}
          <div
            role="status"
            className="flex min-h-14 items-center justify-between gap-3 border-2 border-text bg-surface py-1 pr-1 pl-4"
          >
            <p className="text-sm font-semibold">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                className="min-h-12 shrink-0 px-3 font-display text-lg font-semibold tracking-wide uppercase active:text-muted"
                onClick={() => {
                  toast.action?.run()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </DockItem>
      )}
    </ToastContext>
  )
}
