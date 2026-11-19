import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { createRecord } from '../../db/repository'
import { SETTINGS_ID } from '../../db/types'
import { createRoutine } from '../routines/routineActions'
import { createSplit } from './splitActions'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

/** Duas divisões, como a sua: Upper / Lower (2 rotinas) e PPL (2 rotinas). */
async function createTwoSplits() {
  const ul = await createSplit(db, 'Upper / Lower')
  const ppl = await createSplit(db, 'PPL')
  const upper = await createRoutine(db, 'Upper A', ul)
  const lower = await createRoutine(db, 'Lower A', ul)
  const push = await createRoutine(db, 'Push', ppl)
  const pull = await createRoutine(db, 'Pull', ppl)
  return { ul, ppl, upper, lower, push, pull }
}

/** Um treino já finalizado dessa rotina (para a sequência saber onde parou). */
async function addFinishedWorkout(routineId: string) {
  const now = Date.now()
  await createRecord(db.workouts, {
    routineId,
    startedAt: now - 3_600_000,
    endedAt: now,
    timerStartedAt: null,
    timerStoppedAt: null,
    notes: '',
  })
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
})

describe('aba Treino com várias divisões', () => {
  it('as abas trocam a lista, e a escolha fica salva', async () => {
    await createTwoSplits()
    renderAt('/treino')

    // Começa na primeira divisão: só as rotinas dela.
    expect(await screen.findByRole('button', { name: /Upper A/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lower A/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Push/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'PPL' }))

    expect(await screen.findByRole('button', { name: /Push/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pull/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Upper A/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PPL' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // A escolha foi gravada: vale ao reabrir o app.
    await waitFor(async () => {
      const settings = await db.settings.get(SETTINGS_ID)
      expect(settings?.activeSplitId).toBeTruthy()
    })
  })

  it('cada divisão tem a sua própria sequência ("próximo")', async () => {
    const { upper } = await createTwoSplits()
    // Último treino finalizado: Upper A, da divisão Upper / Lower.
    await addFinishedWorkout(upper)
    renderAt('/treino')

    // Em Upper / Lower, o próximo depois de Upper A é Lower A...
    const lower = await screen.findByRole('button', { name: /Lower A/ })
    expect(lower).toHaveTextContent('próximo da sequência')
    expect(screen.getByRole('button', { name: /Upper A/ })).not.toHaveTextContent(
      'próximo',
    )

    // ...e em PPL, que nunca foi treinada, o próximo é a primeira (Push).
    fireEvent.click(screen.getByRole('button', { name: 'PPL' }))
    const push = await screen.findByRole('button', { name: /Push/ })
    expect(push).toHaveTextContent('próximo da sequência')
  })

  it('com uma divisão só, não mostra as abas', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    await createRoutine(db, 'Upper A', ul)
    renderAt('/treino')

    await screen.findByRole('button', { name: /Upper A/ })
    expect(
      screen.queryByRole('group', { name: 'Divisões de treino' }),
    ).not.toBeInTheDocument()
  })

  it('divisão sem rotinas explica e leva para as Rotinas', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    await createRoutine(db, 'Upper A', ul)
    await createSplit(db, 'PPL') // vazia
    const router = renderAt('/treino')

    fireEvent.click(await screen.findByRole('button', { name: 'PPL' }))

    expect(
      await screen.findByText('Esta divisão ainda não tem rotinas.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Adicionar rotinas' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
  })
})

describe('aba Rotinas: gerenciar divisões', () => {
  it('cria uma divisão nova, dá o nome e ela fica escolhida', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    await createRoutine(db, 'Upper A', ul)
    renderAt('/rotinas')

    fireEvent.click(await screen.findByRole('button', { name: '+ Nova divisão' }))
    const sheet = await screen.findByRole('dialog', { name: 'Nova divisão' })
    fireEvent.change(within(sheet).getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'ABC' },
    })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Pronto' }))

    expect(
      await screen.findByRole('button', { name: 'ABC', pressed: true }),
    ).toBeInTheDocument()
    expect(screen.getByText('Nenhuma rotina nesta divisão ainda.')).toBeInTheDocument()
    // A rotina da outra divisão não aparece aqui.
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Upper A' }),
    ).not.toBeInTheDocument()
  })

  it('exclui uma divisão com rotinas, depois de confirmar quantas vão junto', async () => {
    const { push, pull, ppl } = await createTwoSplits()
    renderAt('/rotinas')

    fireEvent.click(await screen.findByRole('button', { name: 'PPL' }))
    // Espera a aba trocar (a escolha é gravada no banco) antes de editar a divisão.
    await screen.findByRole('button', { name: 'PPL', pressed: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar divisão' }))
    const sheet = await screen.findByRole('dialog', { name: 'PPL' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Excluir divisão' }))

    // A confirmação diz quantas rotinas saem junto e que o histórico fica.
    const confirm = await screen.findByRole('dialog', { name: 'Excluir divisão?' })
    expect(confirm).toHaveTextContent('A divisão e as 2 rotinas dela serão excluídas')
    expect(confirm).toHaveTextContent('continuam no histórico')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'PPL' })).not.toBeInTheDocument(),
    )
    // Sobra só Upper / Lower, que volta a ser a escolhida.
    expect(
      await screen.findByRole('button', { name: 'Upper / Lower', pressed: true }),
    ).toBeInTheDocument()
    expect((await db.splits.get(ppl))?.deletedAt).toBeTypeOf('number')
    expect((await db.routines.get(push))?.deletedAt).toBeTypeOf('number')
    expect((await db.routines.get(pull))?.deletedAt).toBeTypeOf('number')
  })

  it('no editor da rotina, mover para outra divisão só vale ao salvar', async () => {
    const { ppl, ul, upper } = await createTwoSplits()
    const router = renderAt(`/rotinas/${upper}`)

    // O editor mostra as abas das divisões; a atual está marcada.
    expect(
      await screen.findByRole('button', { name: 'Upper / Lower', pressed: true }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'PPL' }))

    // No rascunho, ela entra no fim da PPL (3ª de 3); no banco, nada mudou ainda.
    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
    expect((await db.routines.get(upper))?.splitId).toBe(ul)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => expect((await db.routines.get(upper))?.splitId).toBe(ppl))
    // Espera a lista aparecer (o editor também tem uma aba "PPL" marcada, e some ao salvar).
    await screen.findByRole('heading', { level: 1, name: 'Rotinas' })
    expect(router.state.location.pathname).toBe('/rotinas')
    // A lista de Rotinas abre na divisão para onde a rotina foi.
    expect(
      await screen.findByRole('button', { name: 'PPL', pressed: true }),
    ).toBeInTheDocument()
  })
})
