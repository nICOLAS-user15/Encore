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

/** Everything a component needs to speak the user's language. */
export type I18n = {
  language: Language
  /** Texts: `t.workout.finish`, `t.history.count(3)`... */
  t: Messages
  /** Formatters already bound to the current language. */
  format: ReturnType<typeof createFormatters>
  /** Exercise name in the current language. */
  exerciseName: (exercise: Pick<Exercise, 'names'> | undefined) => string
  /** Routine/exercise note for display (the app's standard phrases are translated). */
  note: (text: string) => string
  /** `false` while the settings have not loaded from the database yet. */
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
 * Default value (Portuguese) for components rendered outside the provider,
 * as in screen tests.
 */
export const I18nContext = createContext<I18n>(createI18n('pt'))

/** Access to texts and formatters in the current language. */
export function useI18n(): I18n {
  return useContext(I18nContext)
}
