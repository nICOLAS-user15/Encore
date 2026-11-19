import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { createRecord } from '../../db/repository'
import { syncSeedExercises } from '../../db/seed'
import { updateRoutineExercise } from '../routines/routineActions'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import { updateSettings } from '../settings/settingsRepository'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  // As telas usam o banco "de verdade" do app (em memória nos testes):
  // limpamos tudo para cada teste começar do zero.
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await syncSeedExercises(db)
})

describe('aba Treino', () => {
  it('lista as rotinas e destaca a próxima da sequência', async () => {
    await importTestProgram(db)
    renderAt('/treino')

    const upperA = await screen.findByRole('button', { name: /Upper A/ })
    expect(upperA).toHaveTextContent('próximo da sequência')
    expect(screen.getByRole('button', { name: /Lower B/ })).not.toHaveTextContent(
      'próximo',
    )
  })

  it('inicia o Upper A com as séries planejadas e a referência', async () => {
    await importTestProgram(db)
    renderAt('/treino')

    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Upper A' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Cardio 15 min no final.')).toBeInTheDocument()
    expect(await screen.findByText('Referência: 25 kg × 8')).toBeInTheDocument()
    // 3+3+2+2+2+2+2 séries, cada uma com seu botão de concluir.
    expect(screen.getAllByRole('button', { name: /^Concluir série/ })).toHaveLength(16)
  })

  it('concluir uma série inicia o timer de descanso', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    const [firstCheck] = await screen.findAllByRole('button', { name: /^Concluir série/ })
    fireEvent.click(firstCheck)

    const timer = await screen.findByRole('timer', { name: 'Descanso' })
    expect(within(timer).getByText('1:30')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: 'Desfazer série 1' }),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('destaca a próxima série e o destaque anda ao concluir', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    const [firstCheck] = await screen.findAllByRole('button', {
      name: 'Concluir série 1',
    })
    // Só uma série do treino inteiro é "a próxima".
    const current = () => document.querySelectorAll('[aria-current="step"]')
    expect(current()).toHaveLength(1)
    expect(firstCheck.closest('li')).toHaveAttribute('aria-current', 'step')

    fireEvent.click(firstCheck)

    const [secondCheck] = await screen.findAllByRole('button', {
      name: 'Concluir série 2',
    })
    await waitFor(() =>
      expect(secondCheck.closest('li')).toHaveAttribute('aria-current', 'step'),
    )
    expect(current()).toHaveLength(1)
  })

  it('treino livre: adiciona um exercício pela busca', async () => {
    renderAt('/treino')

    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    expect(await screen.findByText('Treino vazio')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar exercício' }))
    const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
    // findBy (e não getBy): a lista de exercícios carrega do banco de forma assíncrona.
    fireEvent.change(await within(picker).findByRole('searchbox'), {
      target: { value: 'supino reto' },
    })
    fireEvent.click(
      await within(picker).findByRole('button', { name: /Supino reto com barra/ }),
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Supino reto com barra' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Concluir série/ })).toHaveLength(1)
  })
})

describe('cronômetro na tela', () => {
  it('o usuário inicia o cronômetro e finaliza o treino pelo card, com confirmação', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    const timer = await screen.findByRole('region', { name: 'Cronômetro' })
    expect(within(timer).getByText('Cronômetro não iniciado')).toBeInTheDocument()

    fireEvent.click(within(timer).getByRole('button', { name: 'Iniciar cronômetro' }))
    expect(await within(timer).findByText('Cronômetro rodando')).toBeInTheDocument()

    // Parar e Descansar saíram: sobra só o "Finalizar treino" (e não há outro na tela).
    expect(within(timer).queryByRole('button', { name: 'Parar' })).not.toBeInTheDocument()
    expect(
      within(timer).queryByRole('button', { name: 'Descansar' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Finalizar treino' })).toHaveLength(1)

    // Pausar congela o relógio; Retomar volta a rodar.
    fireEvent.click(within(timer).getByRole('button', { name: 'Pausar' }))
    expect(await within(timer).findByText('Cronômetro pausado')).toBeInTheDocument()
    fireEvent.click(within(timer).getByRole('button', { name: 'Retomar' }))
    expect(await within(timer).findByText('Cronômetro rodando')).toBeInTheDocument()

    // Tocar abre a confirmação; "Cancelar" mantém o treino aberto.
    fireEvent.click(within(timer).getByRole('button', { name: 'Finalizar treino' }))
    const dialog = await screen.findByRole('dialog', { name: 'Finalizar treino?' })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(timer).getByText('Cronômetro rodando')).toBeInTheDocument()
  })
})

describe('lembrete de backup na aba Treino', () => {
  /** Um treino já finalizado: agora existe algo a perder. */
  async function addFinishedWorkout() {
    const now = Date.now()
    await createRecord(db.workouts, {
      routineId: null,
      startedAt: now - 3_600_000,
      endedAt: now,
      timerStartedAt: null,
      timerStoppedAt: null,
      notes: '',
    })
  }

  it('com treinos e sem nenhum backup, lembra e leva às Configurações', async () => {
    await importTestProgram(db)
    await addFinishedWorkout()
    const router = renderAt('/treino')

    expect(await screen.findByText(/Você ainda não fez backup/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Fazer backup' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/configuracoes'))
  })

  it('com backup recente, não incomoda', async () => {
    await importTestProgram(db)
    await addFinishedWorkout()
    await updateSettings(db, { lastBackupAt: Date.now() })
    renderAt('/treino')

    await screen.findByRole('button', { name: /Upper A/ })
    expect(screen.queryByRole('link', { name: 'Fazer backup' })).not.toBeInTheDocument()
  })
})

describe('menu ⋯ do exercício', () => {
  it('"Remover exercício" pede confirmação e tira o exercício do treino', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    fireEvent.click(
      await screen.findByRole('button', { name: 'Mais opções: Supino reto com barra' }),
    )
    const menu = await screen.findByRole('dialog', { name: 'Supino reto com barra' })
    fireEvent.click(within(menu).getByRole('button', { name: 'Remover exercício' }))

    const confirm = await screen.findByRole('dialog', { name: 'Remover exercício?' })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Remover' }))

    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { level: 2, name: 'Supino reto com barra' }),
      ).not.toBeInTheDocument(),
    )
    // Os outros exercícios continuam.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Puxada frontal' }),
    ).toBeInTheDocument()
  })
})

describe('descanso por exercício', () => {
  /** Inicia o Upper A, conclui a 1ª série do supino e devolve a barra de descanso. */
  async function completeFirstBenchSet() {
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    const [firstCheck] = await screen.findAllByRole('button', {
      name: 'Concluir série 1',
    })
    fireEvent.click(firstCheck)
    return screen.findByRole('timer', { name: 'Descanso' })
  }

  it('usa o descanso definido na rotina para aquele exercício', async () => {
    await importTestProgram(db)
    const [upperA] = await listRoutinesWithExercises(db)
    await updateRoutineExercise(db, upperA.items[0].id, { restSeconds: 180 })

    const timer = await completeFirstBenchSet()

    expect(within(timer).getByText('3:00')).toBeInTheDocument()
  })

  it('item salvo antes do campo existir usa o padrão das Configurações', async () => {
    await importTestProgram(db)
    const [upperA] = await listRoutinesWithExercises(db)
    // Simula o registro antigo: sem a propriedade restSeconds.
    await db.routineExercises.update(upperA.items[0].id, { restSeconds: undefined })

    const timer = await completeFirstBenchSet()

    expect(within(timer).getByText('1:30')).toBeInTheDocument()
  })
})
