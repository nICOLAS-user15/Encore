/**
 * Junta classes CSS ignorando valores falsos.
 * Ex.: cn('p-4', isActive && 'text-text') -> 'p-4 text-text' ou 'p-4'.
 * (Versão mínima do pacote `clsx`, sem precisar de dependência.)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
