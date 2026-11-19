import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { syncSeedExercises } from '../../db/seed'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await syncSeedExercises(db)
})

/** Abre um treino livre e o seletor "Adicionar exercício". Devolve o seletor e o router. */
async function openPicker() {
  const router = createMemoryRouter(routes, { initialEntries: ['/treino'] })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
  fireEvent.click(await screen.findByRole('button', { name: '+ Adicionar exercício' }))
  const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
  return { router, picker }
}

describe('exercício fora da biblioteca', () => {
  it('digitar um nome novo, criar, e ele entra no treino e aparece na biblioteca', async () => {
    const { router, picker } = await openPicker()

    fireEvent.change(await within(picker).findByRole('searchbox'), {
      target: { value: 'Remada articulada' },
    })
    fireEvent.click(
      await within(picker).findByRole('button', { name: '+ Criar “Remada articulada”' }),
    )

    // O formulário já vem com o nome; grupo e equipamento são obrigatórios.
    const form = await screen.findByRole('dialog', { name: 'Novo exercício' })
    expect(within(form).getByRole('textbox', { name: 'Nome do exercício' })).toHaveValue(
      'Remada articulada',
    )
    const create = within(form).getByRole('button', { name: 'Criar e adicionar' })
    expect(create).toBeDisabled()
    fireEvent.click(within(form).getByRole('button', { name: 'Costas' }))
    expect(create).toBeDisabled() // falta o equipamento
    fireEvent.click(within(form).getByRole('button', { name: 'Máquina' }))
    expect(create).toBeEnabled()
    fireEvent.click(create)

    // Entrou no treino...
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Remada articulada' }),
    ).toBeInTheDocument()
    // ...foi salvo na biblioteca como exercício do usuário...
    const saved = (await db.exercises.toArray()).find(
      (exercise) => exercise.names.pt === 'Remada articulada',
    )
    expect(saved).toMatchObject({
      isCustom: true,
      muscleGroup: 'back',
      equipment: 'machine',
    })

    // ...e aparece na aba Exercícios.
    await act(async () => {
      await router.navigate('/exercicios')
    })
    expect(await screen.findByText('Remada articulada')).toBeInTheDocument()
  })

  it('um nome que já existe não oferece criar (evita repetido)', async () => {
    const { picker } = await openPicker()
    const search = await within(picker).findByRole('searchbox')

    // Nome parcial: ainda não existe, então oferece.
    fireEvent.change(search, { target: { value: 'supino' } })
    expect(
      await within(picker).findByRole('button', { name: '+ Criar “supino”' }),
    ).toBeInTheDocument()

    // Nome completo (ignorando maiúsculas e acento) ou em inglês: já existe, não oferece.
    fireEvent.change(search, { target: { value: 'SUPINO reto com barra' } })
    await waitFor(() =>
      expect(
        within(picker).queryByRole('button', { name: /Criar/ }),
      ).not.toBeInTheDocument(),
    )
    fireEvent.change(search, { target: { value: 'bench press' } })
    expect(
      within(picker).queryByRole('button', { name: /Criar/ }),
    ).not.toBeInTheDocument()
  })

  it('"Cancelar" volta para a lista sem criar nada', async () => {
    const { picker } = await openPicker()
    const before = await db.exercises.count()
    fireEvent.change(await within(picker).findByRole('searchbox'), {
      target: { value: 'Exercício inventado' },
    })
    fireEvent.click(
      await within(picker).findByRole('button', {
        name: '+ Criar “Exercício inventado”',
      }),
    )

    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Novo exercício' })).getByRole(
        'button',
        { name: 'Cancelar' },
      ),
    )

    expect(
      await screen.findByRole('dialog', { name: 'Adicionar exercício' }),
    ).toBeInTheDocument()
    expect(await db.exercises.count()).toBe(before)
  })
})
