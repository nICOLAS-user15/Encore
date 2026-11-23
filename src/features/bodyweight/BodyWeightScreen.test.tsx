import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { BottomDockProvider } from '../../ui/BottomDock'
import { ToastProvider } from '../../ui/Toast'
import { logBodyWeight } from './bodyWeightActions'

/** /peso with the dock and the toasts ("Desfazer" lives there). */
function renderScreen() {
  const router = createMemoryRouter(routes, { initialEntries: ['/peso'] })
  render(
    <BottomDockProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </BottomDockProvider>,
  )
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
})

describe('Peso corporal', () => {
  it('logs a weight, which shows in the list and in the summary', async () => {
    renderScreen()

    const field = await screen.findByRole('textbox', { name: 'Peso' })
    fireEvent.change(field, { target: { value: '82,4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar peso' }))

    const list = await screen.findByRole('list', { name: 'Registros' })
    expect(await within(list).findByText('82,4 kg')).toBeInTheDocument()
    expect(await db.bodyWeights.count()).toBe(1)
  })

  it('the field starts at the last measurement', async () => {
    await logBodyWeight(db, 80, Date.now() - 86_400_000)
    await logBodyWeight(db, 81.5)

    renderScreen()

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'Peso' })).toHaveValue('81,5'),
    )
  })

  it('deleting an entry offers "Desfazer", which brings it back', async () => {
    await logBodyWeight(db, 81.5)
    renderScreen()

    fireEvent.click(await screen.findByRole('button', { name: /^Excluir registro de/ }))
    expect(await screen.findByText('Nenhum registro ainda.')).toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }))
    const list = await screen.findByRole('list', { name: 'Registros' })
    expect(await within(list).findByText('81,5 kg')).toBeInTheDocument()
  })
})
