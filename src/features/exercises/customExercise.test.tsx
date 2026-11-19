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

/** Opens a free workout and the "Adicionar exercício" picker. Returns the picker and the router. */
async function openPicker() {
  const router = createMemoryRouter(routes, { initialEntries: ['/treino'] })
  render(<RouterProvider router={router} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
  fireEvent.click(await screen.findByRole('button', { name: '+ Adicionar exercício' }))
  const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
  return { router, picker }
}

describe('exercise outside the library', () => {
  it('typing a new name and creating it adds it to the workout and shows it in the library', async () => {
    const { router, picker } = await openPicker()

    fireEvent.change(await within(picker).findByRole('searchbox'), {
      target: { value: 'Remada articulada' },
    })
    fireEvent.click(
      await within(picker).findByRole('button', { name: '+ Criar “Remada articulada”' }),
    )

    // The form already comes with the name; group and equipment are required.
    const form = await screen.findByRole('dialog', { name: 'Novo exercício' })
    expect(within(form).getByRole('textbox', { name: 'Nome do exercício' })).toHaveValue(
      'Remada articulada',
    )
    const create = within(form).getByRole('button', { name: 'Criar e adicionar' })
    expect(create).toBeDisabled()
    fireEvent.click(within(form).getByRole('button', { name: 'Costas' }))
    expect(create).toBeDisabled() // equipment is missing
    fireEvent.click(within(form).getByRole('button', { name: 'Máquina' }))
    expect(create).toBeEnabled()
    fireEvent.click(create)

    // It went into the workout...
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Remada articulada' }),
    ).toBeInTheDocument()
    // ...was saved to the library as a user exercise...
    const saved = (await db.exercises.toArray()).find(
      (exercise) => exercise.names.pt === 'Remada articulada',
    )
    expect(saved).toMatchObject({
      isCustom: true,
      muscleGroup: 'back',
      equipment: 'machine',
    })

    // ...and shows up in the Exercícios tab.
    await act(async () => {
      await router.navigate('/exercicios')
    })
    expect(await screen.findByText('Remada articulada')).toBeInTheDocument()
  })

  it('a name that already exists does not offer to create (avoids duplicates)', async () => {
    const { picker } = await openPicker()
    const search = await within(picker).findByRole('searchbox')

    // Partial name: does not exist yet, so it offers.
    fireEvent.change(search, { target: { value: 'supino' } })
    expect(
      await within(picker).findByRole('button', { name: '+ Criar “supino”' }),
    ).toBeInTheDocument()

    // Full name (ignoring case and accents) or in English: already exists, does not offer.
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

  it('"Cancelar" goes back to the list without creating anything', async () => {
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
