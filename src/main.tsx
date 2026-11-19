import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorScreen } from './app/ErrorScreen'
import { db } from './db/db'
import { syncSeedExercises } from './db/seed'
import { createI18n, I18nContext } from './i18n/context'
import { requestPersistentStorage } from './lib/storage'
import './ui/theme.css'

// Não bloqueiam a primeira renderização: as telas que leem o banco
// (via useLiveQuery) se atualizam sozinhas quando o seed terminar.
syncSeedExercises(db).catch((error: unknown) => {
  console.error('Falha ao popular o banco local', error)
})
requestPersistentStorage().catch((error: unknown) => {
  console.warn('Não foi possível pedir armazenamento persistente', error)
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Elemento #root não encontrado no index.html')
}

const root = createRoot(rootElement)
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Uma versão nova do app (outra aba) quer atualizar o banco: esta aba precisa liberar.
db.on('versionchange', () => window.location.reload())

// O banco não abriu (migração com erro, armazenamento indisponível, modo privado):
// sem isto, todas as telas ficariam vazias sem explicação. O idioma salvo está no banco
// (que não abriu), então vale o do navegador.
db.open().catch((error: unknown) => {
  const language = navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en'
  root.render(
    <I18nContext value={createI18n(language)}>
      <ErrorScreen error={error} database />
    </I18nContext>,
  )
})
