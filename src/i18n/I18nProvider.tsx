import { useEffect, useMemo, type ReactNode } from 'react'
import { useSettings } from '../features/settings/useSettings'
import { LOCALES } from '../lib/format'
import { createI18n, I18nContext } from './context'

/**
 * Lê o idioma das configurações (no banco) e entrega textos e formatadores
 * para todos os componentes abaixo dele. Trocar o idioma nas Configurações
 * atualiza o app inteiro na hora, porque `useSettings` usa useLiveQuery.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings, loaded } = useSettings()
  const value = useMemo(
    () => createI18n(settings.language, loaded),
    [settings.language, loaded],
  )

  // Mantém o <html lang="..."> certo (leitores de tela e tradução do navegador usam).
  useEffect(() => {
    document.documentElement.lang = LOCALES[settings.language]
  }, [settings.language])

  // React 19: o próprio contexto funciona como provider.
  return <I18nContext value={value}>{children}</I18nContext>
}
