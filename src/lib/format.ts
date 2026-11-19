import type { Language } from '../db/types'

/*
 * Formatação simples de números para a tela, no padrão de cada idioma
 * (português: vírgula decimal; inglês: ponto).
 * Nos componentes, use `format` do `useI18n()`, que já passa o idioma atual.
 * Para carga com unidade e conversão kg/lb, veja `units.ts` (exercício 1).
 */

/** Código de localidade usado pelas APIs `toLocale...` do JavaScript. */
export const LOCALES: Record<Language, string> = {
  pt: 'pt-BR',
  en: 'en-US',
}

/** pt: 12.5 -> "12,5" | en: 12.5 -> "12.5" | 100 -> "100" */
export function formatDecimal(value: number, language: Language = 'pt'): string {
  const text = String(value)
  return language === 'pt' ? text.replace('.', ',') : text
}

/** Faixa de repetições: (6, 10) -> "6–10" | (8, 8) -> "8" */
export function formatRepRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`
}

/** Meta de uma rotina: (3, 6, 10) -> "3 × 6–10" */
export function formatTarget(sets: number, repsMin: number, repsMax: number): string {
  return `${sets} × ${formatRepRange(repsMin, repsMax)}`
}

/** Uma série: (25, 8) -> "25 kg × 8" */
export function formatSet(
  weightKg: number,
  reps: number,
  language: Language = 'pt',
): string {
  return `${formatDecimal(weightKg, language)} kg × ${reps}`
}

/** Referência de uma rotina: (25, 8) -> "25 kg × 8" | (15, null) -> "15 kg" */
export function formatReference(
  weightKg: number,
  reps: number | null,
  language: Language = 'pt',
): string {
  return reps === null
    ? `${formatDecimal(weightKg, language)} kg`
    : formatSet(weightKg, reps, language)
}

/**
 * Resumo de várias séries. Mesma carga em todas: "25 kg × 8, 8, 7".
 * Cargas diferentes: "30 kg × 10 · 27,5 kg × 8".
 */
export function formatSetsSummary(
  sets: Array<{ weightKg: number; reps: number }>,
  language: Language = 'pt',
): string {
  if (sets.length === 0) {
    return ''
  }
  const sameWeight = sets.every((set) => set.weightKg === sets[0].weightKg)
  if (sameWeight) {
    const reps = sets.map((set) => set.reps).join(', ')
    return `${formatDecimal(sets[0].weightKg, language)} kg × ${reps}`
  }
  return sets.map((set) => formatSet(set.weightKg, set.reps, language)).join(' · ')
}

/** Volume arredondado com separador de milhar: pt "12.341 kg" | en "12,341 kg" */
export function formatVolume(kg: number, language: Language = 'pt'): string {
  return `${Math.round(kg).toLocaleString(LOCALES[language])} kg`
}

/**
 * Lê um número digitado pelo usuário, aceitando vírgula ou ponto.
 * Devolve `null` se o texto não for um número válido.
 * "12,5" -> 12.5 | "abc" -> null | "" -> null
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (normalized === '') {
    return null
  }
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
