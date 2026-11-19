import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  /** Texto de apoio logo abaixo do título. */
  hint?: string
  children: ReactNode
}

/** Bloco de uma tela com título sublinhado (Configurações, editor de rotina...). */
export function Section({ title, hint, children }: SectionProps) {
  return (
    <section>
      <h2 className="mb-3 border-b-2 border-text pb-1 font-display text-xl font-bold uppercase">
        {title}
      </h2>
      {hint && <p className="-mt-1 mb-3 text-sm text-muted">{hint}</p>}
      {children}
    </section>
  )
}
