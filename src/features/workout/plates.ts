/*
 * Plate calculator: which plates go on EACH side of the bar for a total load.
 * Pure function, tested in plates.test.ts.
 */

/** Bar and plates for the calculator (barbell exercises only). */
export type PlateSetup = { barKg: number; platesKg: number[] }

export type PlateLoad = {
  /** Plates for one side, heaviest first. Empty = only the bar. */
  plates: number[]
  /** Load the plates could not make (whole bar, both sides together); 0 = exact. */
  missingKg: number
}

/** Work in 50 g units: every plate and load in a gym is a multiple of it, and ints avoid float noise. */
const UNIT_KG = 0.05

const toUnits = (kg: number) => Math.round(kg / UNIT_KG)
const toKg = (units: number) => Math.round(units * UNIT_KG * 100) / 100

/**
 * Plates per side for `totalKg` on a bar of `barKg`, using any number of each available
 * plate. Picks the heaviest load that does not go over the target, with the fewest plates
 * (a dynamic programme, not "biggest first": with 15s and 10s, 20 kg a side is 10 + 10).
 * `null` when the load is lighter than the bar.
 */
export function platesPerSide(
  totalKg: number,
  barKg: number,
  platesKg: readonly number[],
): PlateLoad | null {
  if (totalKg < barKg) {
    return null
  }
  const target = Math.floor(toUnits(totalKg - barKg) / 2)
  const sizes = [...new Set(platesKg.map(toUnits))].filter((size) => size > 0)

  // fewest[x] = fewest plates that make exactly x units on one side; last[x] = the plate used.
  const fewest: number[] = Array.from({ length: target + 1 }, () => Infinity)
  const last: number[] = Array.from({ length: target + 1 }, () => 0)
  fewest[0] = 0
  for (let amount = 1; amount <= target; amount++) {
    for (const size of sizes) {
      if (size <= amount && fewest[amount - size] + 1 < fewest[amount]) {
        fewest[amount] = fewest[amount - size] + 1
        last[amount] = size
      }
    }
  }

  let reached = target
  while (fewest[reached] === Infinity) {
    reached--
  }
  const plates: number[] = []
  for (let amount = reached; amount > 0; amount -= last[amount]) {
    plates.push(toKg(last[amount]))
  }
  plates.sort((a, b) => b - a)
  return { plates, missingKg: toKg(toUnits(totalKg - barKg) - reached * 2) }
}
