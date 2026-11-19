import { createContext, useCallback, useContext } from 'react'
import { useI18n } from '../i18n/context'

export type ToastApi = {
  /** Mostra um aviso com botão "Desfazer". */
  showUndo: (message: string, undo: () => void | Promise<unknown>) => void
  showError: (message: string) => void
}

/** Sem provider (testes de um componente só): não mostra nada, mas não quebra. */
const noop: ToastApi = { showUndo: () => {}, showError: () => {} }
export const ToastContext = createContext<ToastApi>(noop)

export function useToast(): ToastApi {
  return useContext(ToastContext)
}

/**
 * Executa uma ação assíncrona do usuário (gravar série, iniciar treino...) e, se o
 * banco recusar (disco cheio, modo privado), mostra o erro em vez de falhar em silêncio.
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
