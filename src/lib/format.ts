import type { Language } from '../db/types'

/*
 * Simple number formatting for the screen, in each language's standard
 * (Portuguese: decimal comma; English: point).
 * In components, use `format` from `useI18n()`, which already passes the current language.
 * For load with unit and kg/lb conversion, see `units.ts` (exercise 1).
 */

/** Locale code used by JavaScript's `toLocale...` APIs. */
export const LOCALES: Record<Language, string> = {
  pt: 'pt-BR',
  en: 'en-US',
}

/** pt: 12.5 -> "12,5" | en: 12.5 -> "12.5" | 100 -> "100" */
export function formatDecimal(value: number, language: Language = 'pt'): string {
  const text = String(value)
  return language === 'pt' ? text.replace('.', ',') : text
}

/** Rep range: (6, 10) -> "6–10" | (8, 8) -> "8" */
export function formatRepRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`
}

/** Target of a routine: (3, 6, 10) -> "3 × 6–10" */
export function formatTarget(sets: number, repsMin: number, repsMax: number): string {
  return `${sets} × ${formatRepRange(repsMin, repsMax)}`
}

/** A set: (25, 8) -> "25 kg × 8" */
export function formatSet(
  weightKg: number,
  reps: number,
  language: Language = 'pt',
): string {
  return `${formatDecimal(weightKg, language)} kg × ${reps}`
}

/** Reference of a routine: (25, 8) -> "25 kg × 8" | (15, null) -> "15 kg" */
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
 * Summary of several sets. Same load in all: "25 kg × 8, 8, 7".
 * Different loads: "30 kg × 10 · 27,5 kg × 8".
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

/** Volume rounded with a thousands separator: pt "12.341 kg" | en "12,341 kg" */
export function formatVolume(kg: number, language: Language = 'pt'): string {
  return `${Math.round(kg).toLocaleString(LOCALES[language])} kg`
}

/**
 * Reads a number typed by the user, accepting a comma or a point.
 * Returns `null` if the text is not a valid number.
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
