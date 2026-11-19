import { useId, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { ArrowLeftIcon } from './icons'
import { useModalDialog } from './useModalDialog'

type SheetProps = {
  open: boolean
  title: string
  onClose: () => void
  /**
   * Tocar fora do painel fecha? Padrão: sim. Painéis com algo digitado (editor de série)
   * usam `false`: um toque errado com a mão suada não pode jogar o valor fora.
   */
  dismissOnBackdrop?: boolean
  children: ReactNode
}

/**
 * Painel que sobe da parte de baixo da tela (fácil de alcançar com o polegar).
 * Fecha tocando fora, na seta ← ("Voltar") ou com Esc.
 *
 * É um `<dialog>` nativo (veja useModalDialog). Ele ocupa a tela inteira e é
 * transparente; o painel visível é a <section> encostada embaixo.
 */
export function Sheet({
  open,
  title,
  onClose,
  dismissOnBackdrop = true,
  children,
}: SheetProps) {
  const titleId = useId()
  const { t } = useI18n()
  const ref = useModalDialog(open)

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // O evento "close" chega por qualquer caminho (Esc, gesto de voltar, nosso
      // close()): avisamos o pai, que guarda o estado. Chamar duas vezes não faz mal.
      onClose={onClose}
      // Toque fora do painel: o alvo é o próprio <dialog> (a área transparente).
      onClick={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) {
          onClose()
        }
      }}
      className="m-0 size-full max-h-none max-w-none flex-col justify-end border-0 bg-transparent p-0 text-text backdrop:animate-fade-in backdrop:bg-background/85 open:flex"
    >
      {/* O conteúdo só existe aberto: cada abertura começa do zero (e sobe de novo). */}
      {open && (
        <section className="pb-safe mx-auto flex max-h-[92dvh] w-full max-w-xl animate-sheet-in flex-col border-t-4 border-text bg-surface">
          {/* Seta à esquerda, como o "Voltar" das telas internas: mesmo gesto, mesmo lugar. */}
          <header className="flex items-center gap-1 border-b-2 border-line py-2 pr-4 pl-1">
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.back}
              className="flex size-12 shrink-0 items-center justify-center active:text-muted [&>svg]:size-6"
            >
              <ArrowLeftIcon />
            </button>
            <h2
              id={titleId}
              className="truncate font-display text-2xl font-bold uppercase"
            >
              {title}
            </h2>
          </header>
          {/* overscroll-contain: rolar o painel não arrasta a página de trás. */}
          <div className="overflow-y-auto overscroll-contain p-4">{children}</div>
        </section>
      )}
    </dialog>
  )
}
