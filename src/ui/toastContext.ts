import { createContext, useCallback, useContext } from 'react'
import { useI18n } from '../i18n/context'

export type ToastApi = {
  /** Shows a notice with a "Desfazer" button. */
  showUndo: (message: string, undo: () => void | Promise<unknown>) => void
  /** Shows a plain notice (no action), e.g. "New record". */
  showInfo: (message: string) => void
  showError: (message: string) => void
}

/** Without a provider (single-component tests): shows nothing, but does not break. */
const noop: ToastApi = { showUndo: () => {}, showInfo: () => {}, showError: () => {} }
export const ToastContext = createContext<ToastApi>(noop)

export function useToast(): ToastApi {
  return useContext(ToastContext)
}

/**
 * Runs an async user action (save set, start workout...) and, if the
 * database refuses (disk full, private mode), shows the error instead of failing silently.
 * Uso: `const run = useAction(); onClick={() => run(() => toggleSetCompleted(db, id))}`.
 */
export function useAction() {
  const { t } = useI18n()
  const { showError } = useToast()
  return useCallback(
    <T>(work: () => Promise<T>): Promise<T | undefined> =>
      work().catch((error: unknown) => {
        console.error(error)
        showError(t.common.actionFailed)
        return undefined
      }),
    [showError, t],
  )
}
