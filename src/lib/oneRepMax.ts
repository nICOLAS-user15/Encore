/**
 * TODO (exercise 2 of 2): 1RM estimate (maximum load for 1 repetition).
 *
 * We will use this in the future to detect records (PRs): is a set of
 * 100 kg x 5 "worth" more than 105 kg x 1? The Epley formula answers:
 *
 *     1RM = load * (1 + reps / 30)
 *
 * Rules your implementation must follow:
 * - `reps === 1`: return the load itself (the formula would give 103.3 for 100 x 1,
 *   and a 1-repetition set IS ALREADY the 1RM).
 * - `reps <= 0` or `weightKg <= 0`: return 0 (invalid set, does not count).
 * - Round the result to 1 decimal place (116.666... -> 116.7).
 *   Tip: Math.round(x * 10) / 10.
 *
 * How to know if you got it right: in `oneRepMax.test.ts`, change `describe.skip` to
 * `describe` and run `pnpm test`.
 *
 * Bonus (optional): the formula loses accuracy above ~12 repetitions.
 * Look up the Brzycki formula and think about when to use each one.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  // Placeholder so the project compiles. Delete it and implement.
  return weightKg * reps * 0
}
