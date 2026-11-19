import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { I18nProvider } from '../i18n/I18nProvider'
import { BottomDockProvider } from '../ui/BottomDock'
import { ToastProvider } from '../ui/Toast'
import { routes } from './routes'
import { Splash } from './Splash'
import { goToStartPage } from './startPage'
import { UpdatePrompt } from './UpdatePrompt'

// Antes de o router ler a URL: entrar no app sempre começa no Treino.
goToStartPage()
const router = createBrowserRouter(routes)

export function App() {
  return (
    // O I18nProvider fica por fora de tudo: todas as telas recebem o idioma escolhido.
    <I18nProvider>
      {/* A doca empilha os avisos fixos acima das abas (descanso, nova versão...). */}
      <BottomDockProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <UpdatePrompt />
        </ToastProvider>
      </BottomDockProvider>
      <Splash />
    </I18nProvider>
  )
}
