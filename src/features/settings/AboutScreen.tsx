import { useI18n } from '../../i18n/context'
import { Logo } from '../../ui/Logo'
import { ScreenHeader } from '../../ui/ScreenHeader'

/** Tela "Sobre o Encore": o que é o app, privacidade e versão. */
export function AboutScreen() {
  const { t } = useI18n()

  return (
    <>
      <ScreenHeader title={t.about.title} />
      <div className="flex flex-col gap-6 px-4 py-6">
        <div>
          <Logo variant="stamp" className="h-40 w-auto" />
          <p className="mt-4 text-lg">{t.about.tagline}</p>
        </div>
        <p className="leading-relaxed text-muted">{t.about.offline}</p>
        <p className="leading-relaxed text-muted">{t.about.privacy}</p>
        <p className="border-t-2 border-line pt-3 text-sm text-muted tabular-nums">
          {t.about.version(__APP_VERSION__)}
        </p>
      </div>
    </>
  )
}
