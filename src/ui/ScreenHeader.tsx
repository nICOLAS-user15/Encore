import type { ReactNode } from 'react'

type ScreenHeaderProps = {
  title: string
  /** Texto pequeno acima do título (ex.: data, contexto). */
  eyebrow?: string
  /** Espaço à direita para um botão de ação. */
  action?: ReactNode
}

/**
 * Título grande da tela. A barra com menu/voltar fica acima dele, no AppLayout
 * (que também cuida da safe area do notch).
 */
export function ScreenHeader({ title, eyebrow, action }: ScreenHeaderProps) {
  return (
    <header className="border-b-4 border-text px-4">
      <div className="flex items-end justify-between gap-4 pt-2 pb-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="truncate font-display text-5xl leading-none font-bold uppercase">
            {title}
          </h1>
        </div>
        {action}
      </div>
    </header>
  )
}
