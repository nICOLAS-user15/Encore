import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { syncSeedExercises } from '../db/seed'
import { routes } from './routes'

/** Mounts the app with the real routes, but with the URL controlled by the test. */
function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  render(<RouterProvider router={router} />)
  return router
}

describe('AppLayout', () => {
  beforeAll(async () => {
    await syncSeedExercises(db)
  })

  it('opens on the Treino tab and shows the 4 tabs', async () => {
    const router = renderApp('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Treino' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treino')

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Treino',
      'Rotinas',
      'Exercícios',
      'Histórico',
    ])
    expect(within(nav).getByRole('link', { name: 'Treino' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('navigates to Exercícios and lists the seed coming from the database', async () => {
    renderApp('/treino')

    fireEvent.click(screen.getByRole('link', { name: 'Exercícios' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Exercícios' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Supino reto com barra')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Peito/ })).toBeInTheDocument()
  })

  it('redirects unknown URLs to Treino', async () => {
    const router = renderApp('/qualquer-coisa')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Treino' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treino')
  })
})
