import { useRouteError } from 'react-router'
import { useI18n } from '../i18n/context'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { BarbellIcon } from '../ui/icons'

type ErrorScreenProps = {
  /** Extra technical message (not shown to the user; goes to the console). */
  error?: unknown
  /** `true` = the local database did not open (nothing will work until it is resolved). */
  database?: boolean
}

/** Error screen: shows something useful instead of a blank screen (or the default error page in English). */
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

/** Version for the routes' `errorElement` (reads the error thrown during rendering). */
export function RouteErrorScreen() {
  return <ErrorScreen error={useRouteError()} />
}
