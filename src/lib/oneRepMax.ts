/**
 * Estimated 1RM (maximum load for 1 repetition), Epley formula:
 *
 *     1RM = load * (1 + reps / 30)
 *
 * Used to compare sets with different loads and reps (is 100 kg x 5 "worth" more than
 * 105 kg x 1? Yes: 116.7 vs 105), which is how personal records are detected.
 * - `reps === 1`: the load itself (a 1-rep set IS the 1RM; the formula would give 103.3 for 100 x 1).
 * - `reps <= 0` or `weightKg <= 0`: 0 (invalid set, does not count).
 * - Rounded to 1 decimal place.
 *
 * Epley loses accuracy above ~12 reps; for a log app that only compares a lifter with
 * themselves, the bias is the same on both sides of the comparison, so it is good enough.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) {
    return 0
  }
  if (reps === 1) {
    return weightKg
  }
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10
}
