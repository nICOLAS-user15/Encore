import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  /** Optional button (e.g. "Criar rotina"). */
  action?: ReactNode
}

/** Default empty state for screens: boxed icon, condensed title and short text. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-start gap-4 border-2 border-dashed border-line p-6">
      <div className="flex size-14 items-center justify-center border-2 border-text text-text [&>svg]:size-7">
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-3xl leading-tight font-bold uppercase">
          {title}
        </h2>
        <p className="max-w-prose text-base leading-relaxed text-muted">{description}</p>
      </div>
      {action}
    </section>
  )
}
