/*
 * Weight unit conversion.
 *
 * Project rule: the database ALWAYS stores kg (`weightKg`). These functions
 * exist only for DISPLAY time (or for reading what the user typed in lb).
 */

export type WeightUnit = 'kg' | 'lb'

/** Official (exact) definition of the international pound. */
export const KG_PER_LB = 0.45359237

/**
 * TODO (exercise 1 of 2): implement the three functions below.
 *
 * 1. `kgToLb(kg)`: converts kg to lb. No rounding.
 *    Tip: 1 lb = KG_PER_LB kg, so lb = kg / KG_PER_LB.
 *
 * 2. `lbToKg(lb)`: the reverse path. Also no rounding.
 *
 * 3. `formatWeight(kg, unit)`: ready-to-display text.
 *    - If `unit` is 'lb', convert first.
 *    - At most 1 decimal place, no leftover ",0", and with a comma (pt-BR):
 *        formatWeight(102.5, 'kg') -> '102,5 kg'
 *        formatWeight(100, 'kg')   -> '100 kg'
 *        formatWeight(100, 'lb')   -> '220,5 lb'
 *    - Tip: look up `Intl.NumberFormat` and the `maximumFractionDigits` option.
 *
 * How to know if you got it right: in `units.test.ts`, change `describe.skip` to
 * `describe` and run `pnpm test`. The tests are already written.
 *
 * (The returns below are just placeholders so the project compiles.)
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
