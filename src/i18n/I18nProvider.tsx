import { useEffect, useMemo, type ReactNode } from 'react'
import { useSettings } from '../features/settings/useSettings'
import { LOCALES } from '../lib/format'
import { createI18n, I18nContext } from './context'

/**
 * Reads the language from the settings (in the database) and hands texts and formatters
 * to all components below it. Changing the language in Settings
 * updates the whole app right away, because `useSettings` uses useLiveQuery.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings, loaded } = useSettings()
  const value = useMemo(
    () => createI18n(settings.language, loaded),
    [settings.language, loaded],
  )

  // Keeps <html lang="..."> correct (screen readers and browser translation use it).
  useEffect(() => {
    document.documentElement.lang = LOCALES[settings.language]
  }, [settings.language])

  // React 19: the context itself works as a provider.
  return <I18nContext value={value}>{children}</I18nContext>
}
