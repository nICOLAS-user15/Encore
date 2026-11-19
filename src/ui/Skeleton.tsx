import { cn } from '../lib/cn'

type SkeletonListProps = {
  /** How many placeholder blocks to show. */
  count?: number
  /** Height of each block (a Tailwind class). */
  heightClass?: string
}

/**
 * Loading placeholder: blocks with the card's shape that "breathe" slowly while the
 * data comes from IndexedDB. It takes a few milliseconds, so what matters is that the layout
 * does not jump when the real content arrives. Purely visual (aria-hidden).
 */
export function SkeletonList({ count = 3, heightClass = 'h-24' }: SkeletonListProps) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cn(
            'animate-skeleton rounded-sm border-2 border-line bg-surface shadow-card',
            heightClass,
          )}
        />
      ))}
    </div>
  )
}
