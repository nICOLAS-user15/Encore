import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { syncSeedExercises } from '../../db/seed'

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  await syncSeedExercises(db)
})

describe('aba Exercícios: livres x máquinas', () => {
  it('o seletor separa exercícios livres e em máquinas', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/exercicios'] })
    render(<RouterProvider router={router} />)

    // Começa em "Todos": aparecem os dois tipos.
    expect(await screen.findByText('Supino reto com barra')).toBeInTheDocument()
    expect(screen.getByText('Tríceps na polia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Máquinas' }))
    expect(screen.getByText('Crucifixo na máquina (peck deck)')).toBeInTheDocument()
    expect(screen.getByText('Tríceps na polia')).toBeInTheDocument()
    expect(screen.queryByText('Supino reto com barra')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Livres' }))
    expect(screen.getByText('Supino reto com barra')).toBeInTheDocument()
    expect(screen.getByText('Flexão de braço')).toBeInTheDocument()
    expect(screen.queryByText('Tríceps na polia')).not.toBeInTheDocument()
  })

  it('o tipo e o grupo muscular se somam', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/exercicios'] })
    render(<RouterProvider router={router} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Máquinas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tríceps' }))

    expect(screen.getByText('Tríceps na polia')).toBeInTheDocument()
    expect(screen.queryByText('Tríceps testa')).not.toBeInTheDocument()
    expect(screen.queryByText('Crucifixo na máquina (peck deck)')).not.toBeInTheDocument()
  })
})
