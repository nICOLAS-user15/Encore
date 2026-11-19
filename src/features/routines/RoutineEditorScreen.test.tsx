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

/** Cria no banco uma rotina "Push" com o supino, pelo mesmo caminho do botão Salvar. */
async function createPush() {
  return saveRoutine(db, null, {
    ...blankDraft(splitId, 0),
    name: 'Push',
    items: [newDraftItem(bench)],
  })
}

/** Escolhe um exercício pelo seletor "+ Adicionar exercício", buscando pelo texto. */
async function addExercise(search: string, name: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: '+ Adicionar exercício' }))
  const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
  fireEvent.change(await within(picker).findByRole('searchbox'), {
    target: { value: search },
  })
  fireEvent.click((await within(picker).findAllByRole('button', { name }))[0])
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

describe('rotina nova', () => {
  it('só existe depois de "Salvar", com tudo o que foi montado', async () => {
    const router = renderAt(['/rotinas'])

    fireEvent.click(await screen.findByRole('button', { name: '+ Nova rotina' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nova rotina' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/rotinas/nova')

    // Sem nome, não dá para salvar, e a tela diz por quê.
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

    // Edita a meta do supino: 3 séries -> 4 (no painel, que só mexe no rascunho).
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

    // Reordena: tríceps sobe para o primeiro lugar.
    fireEvent.click(
      screen.getByRole('button', { name: 'Mover Tríceps na polia para cima' }),
    )
    await waitFor(() => {
      const items = screen.getAllByRole('button', { name: /^Editar / })
      expect(items[0]).toHaveTextContent('Tríceps na polia')
    })

    // Até aqui NADA foi para o banco.
    expect(await db.routines.count()).toBe(0)
    expect(await db.routineExercises.count()).toBe(0)

    fireEvent.click(save)

    // Salvou e voltou para a lista, que mostra a rotina nova.
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

  it('sem nenhuma divisão, não há onde criar: volta para as Rotinas', async () => {
    await db.splits.clear()
    const router = renderAt(['/rotinas/nova'])

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
  })
})

describe('editar uma rotina que existe', () => {
  it('as mudanças só valem depois de "Salvar"', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])

    const name = await screen.findByRole('textbox', { name: 'Nome' })
    expect(name).toHaveValue('Push')
    // Sem alterações, não há o que salvar.
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByText('Nenhuma alteração')).toBeInTheDocument()

    fireEvent.change(name, { target: { value: 'Push A' } })
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    // No banco ainda é o nome antigo.
    expect((await db.routines.get(id))?.name).toBe('Push')

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect((await db.routines.get(id))?.name).toBe('Push A')
  })

  it('remover um exercício pelo painel também só vale ao salvar', async () => {
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

  it('escolher o descanso 2:00 e salvar grava 120 segundos; "Padrão" volta a seguir as Configurações', async () => {
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

  it('mover para outra divisão e para outra posição vale ao salvar', async () => {
    const other = await createSplit(db, 'Upper / Lower')
    const id = await createPush()
    await saveRoutine(db, null, { ...blankDraft(other, 0), name: 'Upper A' })
    renderAt(['/rotinas', `/rotinas/${id}`])

    fireEvent.click(await screen.findByRole('button', { name: 'Upper / Lower' }))
    // Na divisão nova ele entra no fim (2ª de 2); no banco ainda não mudou nada.
    expect(await screen.findByText('2 de 2')).toBeInTheDocument()
    expect((await db.routines.get(id))?.splitId).toBe(splitId)
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }))
    expect(await screen.findByText('1 de 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(async () => expect((await db.routines.get(id))?.splitId).toBe(other))
    expect((await db.routines.get(id))?.order).toBe(0)
    // Espera a lista aparecer (o editor também tem uma aba marcada, e some ao salvar).
    await screen.findByRole('heading', { level: 1, name: 'Rotinas' })
    // E a lista abre na divisão para onde a rotina foi.
    expect(
      await screen.findByRole('button', { name: 'Upper / Lower', pressed: true }),
    ).toBeInTheDocument()
  })
})

describe('sair sem salvar', () => {
  it('com alterações, pede confirmação; "Cancelar" continua editando e "Descartar" sai sem gravar', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])
    fireEvent.change(await screen.findByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Mudei de ideia' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    const confirm = await screen.findByRole('dialog', { name: 'Descartar alterações?' })
    expect(router.state.location.pathname).toBe(`/rotinas/${id}`)

    // Cancelar: continua na tela, com o que digitou.
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Mudei de ideia')

    // Descartar: sai, e o banco continua com o nome antigo.
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    fireEvent.click(
      within(
        await screen.findByRole('dialog', { name: 'Descartar alterações?' }),
      ).getByRole('button', { name: 'Descartar' }),
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect((await db.routines.get(id))?.name).toBe('Push')
  })

  it('sem alterações, "Voltar" sai direto', async () => {
    const id = await createPush()
    const router = renderAt(['/rotinas', `/rotinas/${id}`])
    await screen.findByRole('textbox', { name: 'Nome' })

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/rotinas'))
    expect(
      screen.queryByRole('dialog', { name: 'Descartar alterações?' }),
    ).not.toBeInTheDocument()
  })

  it('uma rotina nova que o usuário desistiu de criar não deixa nada no banco', async () => {
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

describe('excluir a rotina', () => {
  it('pede confirmação e leva de volta para a lista', async () => {
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
