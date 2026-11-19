import { Link, useLocation, useNavigate } from 'react-router'
import { useI18n } from '../i18n/context'
import { ArrowLeftIcon, MenuIcon, SettingsIcon } from '../ui/icons'
import { Logo } from '../ui/Logo'

const iconButtonClasses =
  'flex size-12 items-center justify-center text-text active:text-muted [&>svg]:size-6'

type TopBarProps = {
  /** If set, the screen is an inner one: shows "Voltar" (and this is the fallback destination). */
  backTo?: string
  onOpenMenu: () => void
}

/** Top bar: menu + settings on the tabs; "Voltar" on inner screens. */
export function TopBar({ backTo, onOpenMenu }: TopBarProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // `key === 'default'` = this is the first page of the session (e.g. the app opened
    // straight here). There is nowhere to "go back" to, so we go to the parent screen.
    if (location.key === 'default' && backTo) {
      void navigate(backTo, { replace: true })
    } else {
      void navigate(-1)
    }
  }

  return (
    // pt-safe: on iPhone, the bar starts below the notch / clock.
    <div className="pt-safe">
      <div className="flex h-14 items-center justify-between px-1">
        {backTo ? (
          <button
            type="button"
            onClick={goBack}
            className="flex min-h-12 items-center gap-2 px-3 font-display text-lg font-semibold tracking-wide uppercase active:text-muted [&>svg]:size-6"
          >
            <ArrowLeftIcon />
            {t.common.back}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label={t.app.openMenu}
              className={iconButtonClasses}
            >
              <MenuIcon />
            </button>
            {/* Menu and settings have the same width: the logo stays centered. */}
            <Logo variant="wordmark" className="h-4 w-auto" />
            <Link
              to="/configuracoes"
              aria-label={t.app.settings}
              className={iconButtonClasses}
            >
              <SettingsIcon />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
