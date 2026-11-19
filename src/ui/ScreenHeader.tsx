import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type ScreenHeaderProps = {
  title: string
  /** Small text above the title (e.g. date, context). */
  eyebrow?: string
  /** Space on the right for an action button. */
  action?: ReactNode
  /** `compact`: smaller title, for screens where the content matters more (active workout). */
  size?: 'large' | 'compact'
}

/**
 * Big screen title. The bar with menu/back sits above it, in AppLayout
 * (which also handles the notch safe area).
 */
export function ScreenHeader({
  title,
  eyebrow,
  action,
  size = 'large',
}: ScreenHeaderProps) {
  return (
    <header className="border-b-4 border-text px-4">
      <div className="flex items-end justify-between gap-4 pt-2 pb-3">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-widest text-muted uppercase">
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              'truncate font-display leading-none font-bold uppercase',
              size === 'large' ? 'text-5xl' : 'text-4xl',
            )}
          >
            {title}
          </h1>
        </div>
        {action}
      </div>
    </header>
  )
}
