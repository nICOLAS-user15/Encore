import { useRouteError } from 'react-router'
import { useI18n } from '../i18n/context'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { BarbellIcon } from '../ui/icons'

type ErrorScreenProps = {
  /** Mensagem técnica extra (não é mostrada ao usuário; vai para o console). */
  error?: unknown
  /** `true` = o banco local não abriu (nada vai funcionar até resolver). */
  database?: boolean
}

/** Tela de erro: mostra algo útil em vez da tela vazia (ou da página de erro padrão em inglês). */
export function ErrorScreen({ error, database = false }: ErrorScreenProps) {
  const { t } = useI18n()
  if (error !== undefined) {
    console.error(error)
  }
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-8">
      <EmptyState
        icon={<BarbellIcon />}
        title={t.errors.title}
        description={database ? t.errors.databaseDescription : t.errors.description}
        action={
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t.errors.reload}
          </Button>
        }
      />
    </div>
  )
}

/** Versão para o `errorElement` das rotas (lê o erro lançado durante a renderização). */
export function RouteErrorScreen() {
  return <ErrorScreen error={useRouteError()} />
}
