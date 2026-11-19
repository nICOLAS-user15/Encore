/**
 * TODO (exercício 2 de 2): estimativa de 1RM (carga máxima para 1 repetição).
 *
 * Vamos usar isto no futuro para detectar recordes (PRs): uma série de
 * 100 kg x 5 "vale" mais que 105 kg x 1? A fórmula de Epley responde:
 *
 *     1RM = carga * (1 + reps / 30)
 *
 * Regras que a sua implementação deve seguir:
 * - `reps === 1`: devolva a própria carga (a fórmula daria 103,3 para 100 x 1,
 *   e uma série de 1 repetição JÁ É o 1RM).
 * - `reps <= 0` ou `weightKg <= 0`: devolva 0 (série inválida, não conta).
 * - Arredonde o resultado para 1 casa decimal (116.666... -> 116.7).
 *   Dica: Math.round(x * 10) / 10.
 *
 * Como saber se acertou: em `oneRepMax.test.ts`, troque `describe.skip` por
 * `describe` e rode `pnpm test`.
 *
 * Bônus (opcional): a fórmula perde precisão acima de ~12 repetições.
 * Pesquise a fórmula de Brzycki e pense em quando usar cada uma.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number {
  // Placeholder para o projeto compilar. Apague e implemente.
  return weightKg * reps * 0
}
