import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  /** Supporting text right below the title. */
  hint?: string
  children: ReactNode
}

/** Screen block with an underlined title (Settings, routine editor...). */
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
