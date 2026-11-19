/*
 * Conversão de unidades de carga.
 *
 * Regra do projeto: o banco SEMPRE guarda em kg (`weightKg`). Estas funções
 * existem só para a hora de EXIBIR (ou de ler o que o usuário digitou em lb).
 */

export type WeightUnit = 'kg' | 'lb'

/** Definição oficial (exata) da libra internacional. */
export const KG_PER_LB = 0.45359237

/**
 * TODO (exercício 1 de 2): implemente as três funções abaixo.
 *
 * 1. `kgToLb(kg)`: converte kg para lb. Sem arredondar.
 *    Dica: 1 lb = KG_PER_LB kg, então lb = kg / KG_PER_LB.
 *
 * 2. `lbToKg(lb)`: o caminho inverso. Também sem arredondar.
 *
 * 3. `formatWeight(kg, unit)`: texto pronto para a tela.
 *    - Se `unit` for 'lb', converta antes.
 *    - No máximo 1 casa decimal, sem ",0" sobrando, e com vírgula (pt-BR):
 *        formatWeight(102.5, 'kg') -> '102,5 kg'
 *        formatWeight(100, 'kg')   -> '100 kg'
 *        formatWeight(100, 'lb')   -> '220,5 lb'
 *    - Dica: pesquise `Intl.NumberFormat` e a opção `maximumFractionDigits`.
 *
 * Como saber se acertou: em `units.test.ts`, troque `describe.skip` por
 * `describe` e rode `pnpm test`. Os testes já estão escritos.
 *
 * (Os retornos abaixo são só placeholders para o projeto compilar.)
 */
export function kgToLb(kg: number): number {
  return kg
}

export function lbToKg(lb: number): number {
  return lb
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${kg} ${unit}`
}
