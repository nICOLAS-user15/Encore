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

/** Two splits, like yours: Upper / Lower (2 routines) and PPL (2 routines). */
async function createTwoSplits() {
  const ul = await createSplit(db, 'Upper / Lower')
  const ppl = await createSplit(db, 'PPL')
  const upper = await createRoutine(db, 'Upper A', ul)
  const lower = await createRoutine(db, 'Lower A', ul)
  const push = await createRoutine(db, 'Push', ppl)
  const pull = await createRoutine(db, 'Pull', ppl)
  return { ul, ppl, upper, lower, push, pull }
}

/** A finished workout of that routine (so the sequence knows where it stopped). */
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

describe('Treino tab with several splits', () => {
  it('the tabs switch the list, and the choice is saved', async () => {
    await createTwoSplits()
    renderAt('/treino')

    // Starts on the first split: only its routines.
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

    // The choice was saved: it holds when reopening the app.
    await waitFor(async () => {
      const settings = await db.settings.get(SETTINGS_ID)
      expect(settings?.activeSplitId).toBeTruthy()
    })
  })

  it('each split has its own sequence ("next")', async () => {
    const { upper } = await createTwoSplits()
    // Last finished workout: Upper A, from the Upper / Lower split.
    await addFinishedWorkout(upper)
    renderAt('/treino')

    // In Upper / Lower, the next after Upper A is Lower A...
    const lower = await screen.findByRole('button', { name: /Lower A/ })
    expect(lower).toHaveTextContent('próximo da sequência')
    expect(screen.getByRole('button', { name: /Upper A/ })).not.toHaveTextContent(
      'próximo',
    )

    // ...and in PPL, which was never trained, the next is the first one (Push).
    fireEvent.click(screen.getByRole('button', { name: 'PPL' }))
    const push = await screen.findByRole('button', { name: /Push/ })
    expect(push).toHaveTextContent('próximo da sequência')
  })

  it('with a single split, does not show the tabs', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    await createRoutine(db, 'Upper A', ul)
    renderAt('/treino')

    await screen.findByRole('button', { name: /Upper A/ })
    expect(
      screen.queryByRole('group', { name: 'Divisões de treino' }),
    ).not.toBeInTheDocument()
  })

  it('split with no routines explains and leads to Rotinas', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    await createRoutine(db, 'Upper A', ul)
    await createSplit(db, 'PPL') // empty
    const router = renderAt('/treino')

    fireEvent.click(await screen.findByRole('button', { name: 'PPL' }))

    expect(
      await screen.findByText('Esta divisão ainda não tem rotinas.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Adicionar rotinas' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
  })
})

describe('Rotinas tab: manage splits', () => {
  it('creates a new split, names it and it becomes the selected one', async () => {
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
    // The other split's routine does not show here.
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Upper A' }),
    ).not.toBeInTheDocument()
  })

  it('deletes a split with routines, after confirming how many go along', async () => {
    const { push, pull, ppl } = await createTwoSplits()
    renderAt('/rotinas')

    fireEvent.click(await screen.findByRole('button', { name: 'PPL' }))
    // Wait for the tab to switch (the choice is written to the database) before editing the split.
    await screen.findByRole('button', { name: 'PPL', pressed: true })
    fireEvent.click(await screen.findByRole('button', { name: 'Editar divisão' }))
    const sheet = await screen.findByRole('dialog', { name: 'PPL' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Excluir divisão' }))

    // The confirmation says how many routines go along and that the history stays.
    const confirm = await screen.findByRole('dialog', { name: 'Excluir divisão?' })
    expect(confirm).toHaveTextContent('A divisão e as 2 rotinas dela serão excluídas')
    expect(confirm).toHaveTextContent('continuam no histórico')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'PPL' })).not.toBeInTheDocument(),
    )
    // Only Upper / Lower is left, which becomes the selected one again.
    expect(
      await screen.findByRole('button', { name: 'Upper / Lower', pressed: true }),
    ).toBeInTheDocument()
    expect((await db.splits.get(ppl))?.deletedAt).toBeTypeOf('number')
    expect((await db.routines.get(push))?.deletedAt).toBeTypeOf('number')
    expect((await db.routines.get(pull))?.deletedAt).toBeTypeOf('number')
  })

  it('in the routine editor, moving to another split only counts on save', async () => {
    const { ppl, ul, upper } = await createTwoSplits()
    const router = renderAt(`/rotinas/${upper}`)

    // The editor shows the split tabs; the current one is marked.
    expect(
      await screen.findByRole('button', { name: 'Upper / Lower', pressed: true }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'PPL' }))

    // In the draft, it goes to the end of PPL (3rd of 3); in the database, nothing changed yet.
    expect(await screen.findByText('3 de 3')).toBeInTheDocument()
    expect((await db.routines.get(upper))?.splitId).toBe(ul)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => expect((await db.routines.get(upper))?.splitId).toBe(ppl))
    // Wait for the list to appear (the editor also has a marked "PPL" tab, which goes away on save).
    await screen.findByRole('heading', { level: 1, name: 'Rotinas' })
    expect(router.state.location.pathname).toBe('/rotinas')
    // The Routines list opens on the split the routine went to.
    expect(
      await screen.findByRole('button', { name: 'PPL', pressed: true }),
    ).toBeInTheDocument()
  })
})
