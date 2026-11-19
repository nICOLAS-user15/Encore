import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { DockItem } from './BottomDock'
import { ToastContext, type ToastApi } from './toastContext'

/*
 * Quick notice in the dock, with an optional action ("Desfazer"). It serves two uses:
 * - undoing a delete (every delete in the app is soft, so undoing is just clearing `deletedAt`);
 * - telling the user a write failed (e.g. disk full), instead of failing silently.
 * One notice at a time: the newest replaces the previous one.
 */

type ToastData = {
  id: number
  message: string
  /** Button text and action (e.g. "Desfazer"). */
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

  // Disappears on its own. `id` in the effect: a new notice restarts the countdown.
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
          {/* role="status": screen readers announce the notice without moving focus. */}
          <div
            role="status"
            className="flex min-h-14 items-center justify-between gap-3 border-2 border-text bg-surface-high py-1 pr-1 pl-4 shadow-card"
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
