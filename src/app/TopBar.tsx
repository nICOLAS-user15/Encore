import { Link, useLocation, useNavigate } from 'react-router'
import { useI18n } from '../i18n/context'
import { ArrowLeftIcon, MenuIcon, SettingsIcon } from '../ui/icons'
import { Logo } from '../ui/Logo'

const iconButtonClasses =
  'flex size-12 items-center justify-center text-text active:text-muted [&>svg]:size-6'

type TopBarProps = {
  /** Se definido, a tela é interna: mostra "Voltar" (e este é o destino de reserva). */
  backTo?: string
  onOpenMenu: () => void
}

/** Barra do topo: menu + configurações nas abas; "Voltar" nas telas internas. */
export function TopBar({ backTo, onOpenMenu }: TopBarProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()

  function goBack() {
    // `key === 'default'` = esta é a primeira página da sessão (ex.: o app abriu
    // direto aqui). Não há para onde "voltar", então vamos para a tela pai.
    if (location.key === 'default' && backTo) {
      void navigate(backTo, { replace: true })
    } else {
      void navigate(-1)
    }
  }

  return (
    // pt-safe: no iPhone, a barra começa abaixo do notch / relógio.
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
            {/* Menu e configurações têm a mesma largura: o logo fica centralizado. */}
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
