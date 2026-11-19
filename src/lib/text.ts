/**
 * Chave para comparar nomes: sem acentos, minúsculo, sem espaços nas pontas e
 * com espaços repetidos viram um só. "Elevação  Lateral" e "elevacao lateral"
 * geram a mesma chave.
 */
export function nameKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}
