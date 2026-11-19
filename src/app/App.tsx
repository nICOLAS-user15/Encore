import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { I18nProvider } from '../i18n/I18nProvider'
import { BottomDockProvider } from '../ui/BottomDock'
import { ToastProvider } from '../ui/Toast'
import { routes } from './routes'
import { Splash } from './Splash'
import { goToStartPage } from './startPage'
import { UpdatePrompt } from './UpdatePrompt'

// Before the router reads the URL: entering the app always starts at Workout.
goToStartPage()
const router = createBrowserRouter(routes)

export function App() {
  return (
    // I18nProvider sits outside everything: all screens receive the chosen language.
    <I18nProvider>
      {/* The dock stacks the fixed notices above the tabs (rest, new version...). */}
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
