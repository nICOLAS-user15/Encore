import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorScreen } from './app/ErrorScreen'
import { db } from './db/db'
import { syncSeedExercises } from './db/seed'
import { createI18n, I18nContext } from './i18n/context'
import { requestPersistentStorage } from './lib/storage'
import './ui/theme.css'

// They do not block the first render: screens that read the database
// (via useLiveQuery) update on their own when the seed finishes.
syncSeedExercises(db).catch((error: unknown) => {
  console.error('Failed to seed the local database', error)
})
requestPersistentStorage().catch((error: unknown) => {
  console.warn('Could not request persistent storage', error)
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('#root element not found in index.html')
}

const root = createRoot(rootElement)
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// A new app version (another tab) wants to upgrade the database: this tab must let go.
db.on('versionchange', () => window.location.reload())

// The database did not open (failed migration, storage unavailable, private mode):
// without this, every screen would be empty with no explanation. The saved language
// lives in that database, so the browser's language is used instead.
db.open().catch((error: unknown) => {
  const language = navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
  root.render(
    <I18nContext value={createI18n(language)}>
      <ErrorScreen error={error} database />
    </I18nContext>,
  )
})
