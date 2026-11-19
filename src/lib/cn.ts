/**
 * Joins CSS classes ignoring falsy values.
 * E.g.: cn('p-4', isActive && 'text-text') -> 'p-4 text-text' or 'p-4'.
 * (Minimal version of the `clsx` package, with no dependency needed.)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
