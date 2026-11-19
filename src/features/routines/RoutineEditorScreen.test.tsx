import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { SEED_EXERCISES, syncSeedExercises } from '../../db/seed'
import { createSplit } from '../splits/splitActions'
import { saveRoutine } from './routineActions'
import { blankDraft, newDraftItem } from './routineDraft'

const [bench] = SEED_EXERCISES.map((seed) => seed.id)

let splitId: string

function renderAt(entries: string[], index = entries.length - 1) {
  const router = createMemoryRouter(routes, {
    initialEntries: entries,
    initialIndex: index,
  })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await syncSeedExercises(db)
  splitId = await createSplit(db, 'PPL')
})

/** Creates a "Push" routine with the bench press in the database, through the same path as the Save button. */
async function createPush() {
  return saveRoutine(db, null, {
    ...blankDraft(splitId, 0),
    name: 'Push',
    items: [newDraftItem(bench)],
  })
}

/** Picks an exercise through the "+ Adicionar exercício" picker, searching by text. */
async function addExercise(search: string, name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: '+ Adicionar exercício' }))
  const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
  fireEvent.change(await within(picker).findByRole('searchbox'), {
    target: { value: search },
  })
  fireEvent.click((await within(picker).findAllByRole('button', { name }))[0])
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

describe('new routine', () => {
  it('only exists after "Salvar", with everything that was built', async () => {
    const router = renderAt(['/rotinas'])

    fireEvent.click(await screen.findByRole('button', { name: '+ Nova rotina' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nova rotina' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/rotinas/nova')

    // Without a name it cannot be saved, and the screen says why.
    const save = screen.getByRole('button', { name: 'Salvar' })
    expect(save).toBeDisabled()
    expect(screen.getByText('Dê um nome à rotina para salvar')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Push' },
    })
    expect(save).toBeEnabled()
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()

    await addExercise('supino reto', /Supino reto com barra/)
    await addExercise('tríceps na polia', /^Tríceps na polia/)

    // Edit the bench press target: 3 sets -> 4 (in the sheet, which only touches the draft).
    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Supino reto com barra' }),
    )
    const sheet = await screen.findByRole('dialog', { name: 'Supino reto com barra' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Aumentar Séries' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Pronto' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Editar Supino reto com barra' }),
      ).toHaveTextContent('4 × 8–12'),
    )

    // Reorder: triceps moves up to first place.
    fireEvent.click(
      screen.getByRole('button', { name: 'Mover Tríceps na polia para cima' }),
    )
    await waitFor(() => {
      const items = screen.getAllByRole('button', { name: /^Editar / })
      expect(items[0]).toHaveTextContent('Tríceps na polia')
    })

    // Up to here NOTHING went to the database.
    expect(await db.routines.count()).toBe(0)
    expect(await db.routineExercises.count()).toBe(0)

    fireEvent.click(save)

    // Saved and went back to the list, which shows the new routine.
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Push' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/rotinas')
    expect(screen.getByText('4 × 8–12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'PPL', pressed: true })).toBeInTheDocument()
    const items = (await db.routineExercises.toArray()).sort(
      (a, b) => a.position - b.position,
    )
    expect(items.map((item) => item.exerciseId).length).toBe(2)
    expect(items[1].exerciseId).toBe(bench)
  })

  it('with no split, there is nowhere to create: goes back to Rotinas', async () => {
    await db.splits.clear()
    const router = renderAt(['/rotinas/nova'])

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
  })
})

describe('edit an existing routine', () => {
  it('changes only count after "Salvar"', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])

    const name = await screen.findByRole('textbox', { name: 'Nome' })
    expect(name).toHaveValue('Push')
    // With no changes, there is nothing to save.
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByText('Nenhuma alteração')).toBeInTheDocument()

    fireEvent.change(name, { target: { value: 'Push A' } })
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    // The database still has the old name.
    expect((await db.routines.get(id))?.name).toBe('Push')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect((await db.routines.get(id))?.name).toBe('Push A')
  })

  it('removing an exercise through the sheet also only counts on save', async () => {
    const id = await createPush()
    renderAt(['/rotinas', `/rotinas/${id}`])

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Supino reto com barra' }),
    )
    const sheet = await screen.findByRole('dialog', { name: 'Supino reto com barra' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Remover da rotina' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Editar Supino reto com barra' }),
      ).not.toBeInTheDocument(),
    )
    expect(
      await db.routineExercises.filter((item) => item.deletedAt === null).count(),
    ).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () =>
      expect(
        await db.routineExercises.filter((item) => item.deletedAt === null).count(),
      ).toBe(0),
    )
  })

  it('choosing 2:00 rest and saving stores 120 seconds; "Padrão" goes back to following Settings', async () => {
    const id = await createPush()
    renderAt(['/rotinas', `/rotinas/${id}`])

    fireEvent.click(
      await screen.findByRole('button', { name: 'Editar Supino reto com barra' }),
    )
    const sheet = await screen.findByRole('dialog', { name: 'Supino reto com barra' })
    expect(within(sheet).getByRole('button', { name: 'Padrão (1:30)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(within(sheet).getByRole('button', { name: '2:00' }))
    fireEvent.click(within(sheet).getByRole('button', { name: 'Pronto' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => {
      const [item] = await db.routineExercises.toArray()
      expect(item.restSeconds).toBe(120)
    })
  })

  it('moving to another split and another position counts on save', async () => {
    const other = await createSplit(db, 'Upper / Lower')
    const id = await createPush()
    await saveRoutine(db, null, { ...blankDraft(other, 0), name: 'Upper A' })
    renderAt(['/rotinas', `/rotinas/${id}`])

    fireEvent.click(await screen.findByRole('button', { name: 'Upper / Lower' }))
    // In the new split it goes to the end (2nd of 2); the database has not changed yet.
    expect(await screen.findByText('2 de 2')).toBeInTheDocument()
    expect((await db.routines.get(id))?.splitId).toBe(splitId)
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }))
    expect(await screen.findByText('1 de 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => expect((await db.routines.get(id))?.splitId).toBe(other))
    expect((await db.routines.get(id))?.order).toBe(0)
    // Wait for the list to appear (the editor also has a selected tab, which goes away on save).
    await screen.findByRole('heading', { level: 1, name: 'Rotinas' })
    // And the list opens on the split the routine went to.
    expect(
      await screen.findByRole('button', { name: 'Upper / Lower', pressed: true }),
    ).toBeInTheDocument()
  })
})

describe('leaving without saving', () => {
  it('with changes, asks for confirmation; "Cancelar" keeps editing and "Descartar" leaves without saving', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])
    fireEvent.change(await screen.findByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Mudei de ideia' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    const confirm = await screen.findByRole('dialog', { name: 'Descartar alterações?' })
    expect(router.state.location.pathname).toBe(`/rotinas/${id}`)

    // Cancel: stays on the screen, with what was typed.
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Mudei de ideia')

    // Discard: leaves, and the database keeps the old name.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    fireEvent.click(
      within(
        await screen.findByRole('dialog', { name: 'Descartar alterações?' }),
      ).getByRole('button', { name: 'Descartar' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect((await db.routines.get(id))?.name).toBe('Push')
  })

  it('with no changes, "Voltar" leaves right away', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])
    await screen.findByRole('textbox', { name: 'Nome' })

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect(
      screen.queryByRole('dialog', { name: 'Descartar alterações?' }),
    ).not.toBeInTheDocument()
  })

  it('a new routine the user gave up creating leaves nothing in the database', async () => {
    const router = renderAt(['/rotinas', '/rotinas/nova'])
    fireEvent.change(await screen.findByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Rascunho' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    fireEvent.click(
      within(
        await screen.findByRole('dialog', { name: 'Descartar alterações?' }),
      ).getByRole('button', { name: 'Descartar' }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect(await db.routines.count()).toBe(0)
  })
})

describe('delete the routine', () => {
  it('asks for confirmation and goes back to the list', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir rotina' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir rotina?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect(
      await screen.findByText('Nenhuma rotina nesta divisão ainda.'),
    ).toBeInTheDocument()
    expect((await db.routines.get(id))?.deletedAt).toBeTypeOf('number')
  })
})
