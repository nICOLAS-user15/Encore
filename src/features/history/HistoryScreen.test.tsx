import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import {
  finishWorkout,
  startWorkout,
  toggleSetCompleted,
} from '../workout/workoutActions'
import { listWorkoutSets } from '../workout/workoutQueries'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await importTestProgram(db)
})

describe('do treino ao histórico', () => {
  it('finaliza um treino, mostra o detalhe e a lista, e permite excluir', async () => {
    const router = renderAt('/treino')

    // Inicia o Upper A e conclui as 2 primeiras séries (Bench Press, 25 kg × 8).
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    // Cada exercício tem a sua "série 1": [0] é a do primeiro exercício (Bench Press).
    fireEvent.click(
      (await screen.findAllByRole('button', { name: 'Concluir série 1' }))[0],
    )
    await screen.findByRole('button', { name: 'Desfazer série 1' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Concluir série 2' })[0])
    await screen.findByRole('button', { name: 'Desfazer série 2' })

    // Finaliza (com confirmação).
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar treino' }))
    const dialog = await screen.findByRole('dialog', { name: 'Finalizar treino?' })
    expect(dialog).toHaveTextContent('2 séries concluídas')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Finalizar' }))

    // Vai para o detalhe. (Esperamos pela URL, não por um botão "Voltar": o painel
    // de confirmação também tem uma seta "Voltar" enquanto fecha.)
    // Só as séries concluídas ficaram.
    await waitFor(() =>
      expect(router.state.location.pathname).toMatch(/^\/historico\/.+/),
    )
    expect(await screen.findByRole('button', { name: 'Voltar' })).toBeInTheDocument()
    // O conteúdo vem do banco: findBy espera aparecer.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Upper A' }),
    ).toBeInTheDocument()
    expect(await screen.findAllByText('25 kg × 8')).toHaveLength(2)
    expect(screen.getByText('400 kg')).toBeInTheDocument() // 25 × 8 × 2

    // A lista do histórico (pela aba de baixo) mostra o treino.
    fireEvent.click(screen.getByRole('link', { name: 'Histórico' }))
    const item = await screen.findByRole('link', { name: /Upper A/ })
    expect(item).toHaveTextContent('400 kg')

    // "Voltar" no detalhe volta para a lista.
    fireEvent.click(item)
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('link', { name: /Upper A/ })).toBeInTheDocument()

    // Excluir: volta para a lista, agora vazia.
    fireEvent.click(screen.getByRole('link', { name: /Upper A/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir treino' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir treino?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))
    expect(await screen.findByText('Nada por aqui ainda')).toBeInTheDocument()
  })

  it('um id inexistente mostra "Treino não encontrado"', async () => {
    renderAt('/historico/nao-existe')

    expect(await screen.findByText('Treino não encontrado')).toBeInTheDocument()
  })
})

describe('comparação com a vez anterior', () => {
  /** Treino do Upper A concluindo as `count` primeiras séries (25 kg × 8 no supino). */
  async function finishUpperA(count: number) {
    const [upperA] = await listRoutinesWithExercises(db)
    const workout = await startWorkout(db, upperA.routine.id)
    const sets = await listWorkoutSets(db, workout.id)
    for (const set of sets.slice(0, count)) {
      await toggleSetCompleted(db, set.id)
    }
    await finishWorkout(db, workout.id)
    return workout
  }

  it('mostra volume, séries e duração em relação ao Upper A anterior', async () => {
    const first = await finishUpperA(2) // 2 séries: 400 kg
    // Garante a ordem no tempo (os dois treinos podem cair no mesmo milissegundo).
    await db.workouts.update(first.id, { startedAt: first.startedAt - 86_400_000 })
    const second = await finishUpperA(3) // 3 séries: 600 kg

    renderAt(`/historico/${second.id}`)

    const label = await screen.findByText(/^Comparado ao Upper A de/)
    const card = label.parentElement as HTMLElement
    expect(within(card).getByText('+200 kg')).toBeInTheDocument()
    expect(within(card).getByText('+1')).toBeInTheDocument()
  })

  it('na primeira vez da rotina não há comparação', async () => {
    const only = await finishUpperA(2)

    renderAt(`/historico/${only.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Upper A' })
    expect(screen.queryByText(/^Comparado ao/)).not.toBeInTheDocument()
  })
})
