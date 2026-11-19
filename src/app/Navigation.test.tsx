import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import { syncSeedExercises } from '../db/seed'
import { startWorkout } from '../features/workout/workoutActions'
import { I18nProvider } from '../i18n/I18nProvider'
import { routes } from './routes'

function renderApp(initialEntries: string[]) {
  const router = createMemoryRouter(routes, { initialEntries })
  // Com o I18nProvider de verdade, trocar o idioma nas Configurações muda o app inteiro.
  render(
    <I18nProvider>
      <RouterProvider router={router} />
    </I18nProvider>,
  )
  return router
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await syncSeedExercises(db)
})

describe('navegação', () => {
  it('menu lateral abre, navega e fecha', async () => {
    const router = renderApp(['/treino'])

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir menu' }))
    const menu = screen.getByRole('navigation', { name: 'Menu' })
    // A logo com "glitch" tem uma cópia vermelha só visual: leitores de tela ouvem uma vez.
    expect(within(menu).getAllByRole('img', { name: 'Encore' })).toHaveLength(1)
    fireEvent.click(within(menu).getByRole('link', { name: 'Sobre o Encore' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sobre' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sobre')
    expect(screen.queryByRole('navigation', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('"Voltar" volta para a tela anterior', async () => {
    const router = renderApp(['/rotinas'])

    fireEvent.click(await screen.findByRole('link', { name: 'Configurações' }))
    expect(router.state.location.pathname).toBe('/configuracoes')
    expect(screen.queryByRole('button', { name: 'Abrir menu' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Rotinas' }),
    ).toBeInTheDocument()
  })

  it('"Voltar" sem página anterior vai para a tela pai', async () => {
    const router = renderApp(['/configuracoes'])

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Treino' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/treino')
  })

  it('o treino escolhido tem "Voltar" para a lista, que oferece "Continuar"', async () => {
    const router = renderApp(['/treino'])

    // Escolhe um treino: ele abre na rota própria, com "Voltar" no topo.
    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/treino\/.+/))
    const workoutPath = router.state.location.pathname

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))

    // De volta à lista de treinos; o treino continua aberto e dá para retomar.
    await waitFor(() => expect(router.state.location.pathname).toBe('/treino'))
    fireEvent.click(
      await screen.findByRole('link', { name: 'Continuar treino Treino livre' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe(workoutPath))
  })
})

describe('faixa "Treino em andamento"', () => {
  it('aparece fora da aba Treino e leva de volta ao treino', async () => {
    const workout = await startWorkout(db, null)
    const router = renderApp(['/historico'])

    const banner = await screen.findByRole('link', {
      name: 'Voltar ao treino Treino livre',
    })
    fireEvent.click(banner)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/treino/${workout.id}`),
    )
    // Na própria tela do treino, a faixa some.
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: /Voltar ao treino/ }),
      ).not.toBeInTheDocument(),
    )
  })

  it('não aparece sem treino em andamento', async () => {
    renderApp(['/historico'])

    await screen.findByRole('heading', { level: 1, name: 'Histórico' })
    expect(
      screen.queryByRole('link', { name: /Voltar ao treino/ }),
    ).not.toBeInTheDocument()
  })
})

describe('configurações', () => {
  it('trocar para inglês traduz o app inteiro, inclusive os exercícios', async () => {
    renderApp(['/exercicios', '/configuracoes'])

    fireEvent.click(await screen.findByRole('button', { name: 'English' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Exercises' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Bench Press')).toBeInTheDocument()
    expect(screen.queryByText('Supino reto com barra')).not.toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en-US')
  })

  it('salva a duração do descanso e o início automático', async () => {
    renderApp(['/configuracoes'])

    fireEvent.click(await screen.findByRole('button', { name: '2:00' }))
    const autoRest = screen.getByRole('switch', { name: /Começar o descanso/ })
    expect(autoRest).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(autoRest)

    // A gravação é assíncrona: waitFor repete a verificação até passar (ou estourar o tempo).
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '2:00' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await screen.findByRole('switch', { name: /Começar o descanso/, checked: false })
    const saved = await db.settings.toArray()
    expect(saved[0]).toMatchObject({ restSeconds: 120, autoStartRest: false })
  })
})
