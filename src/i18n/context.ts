import { createContext, useContext } from 'react'
import type { Exercise, Language } from '../db/types'
import {
  formatDecimal,
  formatReference,
  formatSet,
  formatSetsSummary,
  formatTarget,
  formatVolume,
  LOCALES,
} from '../lib/format'
import { formatLongDate, formatTime, formatWorkoutDate } from '../lib/time'
import { en } from './en'
import { translateNote } from './notes'
import { pt, type Messages } from './pt'

const MESSAGES: Record<Language, Messages> = { pt, en }

/** Tudo que um componente precisa para falar o idioma do usuário. */
export type I18n = {
  language: Language
  /** Textos: `t.workout.finish`, `t.history.count(3)`... */
  t: Messages
  /** Formatadores já presos ao idioma atual. */
  format: ReturnType<typeof createFormatters>
  /** Nome do exercício no idioma atual. */
  exerciseName: (exercise: Pick<Exercise, 'names'> | undefined) => string
  /** Observação de rotina/exercício para exibir (frases padrão do app são traduzidas). */
  note: (text: string) => string
  /** `false` enquanto as configurações ainda não carregaram do banco. */
  ready: boolean
}

function createFormatters(language: Language) {
  const locale = LOCALES[language]
  return {
    decimal: (value: number) => formatDecimal(value, language),
    set: (weightKg: number, reps: number) => formatSet(weightKg, reps, language),
    reference: (weightKg: number, reps: number | null) =>
      formatReference(weightKg, reps, language),
    setsSummary: (sets: Array<{ weightKg: number; reps: number }>) =>
      formatSetsSummary(sets, language),
    volume: (kg: number) => formatVolume(kg, language),
    target: formatTarget,
    workoutDate: (timestamp: number) => formatWorkoutDate(timestamp, locale),
    longDate: (timestamp: number) => formatLongDate(timestamp, locale),
    time: (timestamp: number) => formatTime(timestamp, locale),
  }
}

export function createI18n(language: Language, ready = true): I18n {
  const t = MESSAGES[language]
  return {
    language,
    t,
    format: createFormatters(language),
    exerciseName: (exercise) => exercise?.names[language] ?? t.common.exerciseFallback,
    note: (text) => translateNote(text, language),
    ready,
  }
}

/**
 * Valor padrão (português) para componentes renderizados fora do provider,
 * como nos testes de tela.
 */
export const I18nContext = createContext<I18n>(createI18n('pt'))

/** Acesso aos textos e formatadores no idioma atual. */
export function useI18n(): I18n {
  return useContext(I18nContext)
}
