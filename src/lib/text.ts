/**
 * Key for comparing names: no accents, lowercase, no spaces at the ends, and
 * repeated spaces become one. "Elevação  Lateral" and "elevacao lateral"
 * produce the same key.
 */
export function nameKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
