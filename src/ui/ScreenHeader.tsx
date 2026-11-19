import type { ReactNode } from 'react'

type ScreenHeaderProps = {
  title: string
  /** Small text above the title (e.g. date, context). */
  eyebrow?: string
  /** Space on the right for an action button. */
  action?: ReactNode
}

/**
 * Big screen title. The bar with menu/back sits above it, in AppLayout
 * (which also handles the notch safe area).
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
