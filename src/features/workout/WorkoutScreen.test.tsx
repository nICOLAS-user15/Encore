import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../app/routes'
import { db } from '../../db/db'
import { createRecord } from '../../db/repository'
import { syncSeedExercises } from '../../db/seed'
import { updateRoutineExercise } from '../routines/routineActions'
import { importTestProgram } from '../../test/fixtures'
import { listRoutinesWithExercises } from '../routines/routineQueries'
import { updateSettings } from '../settings/settingsRepository'
import { BottomDockProvider } from '../../ui/BottomDock'
import { ToastProvider } from '../../ui/Toast'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

beforeEach(async () => {
  // The screens use the app's "real" database (in memory in the tests):
  // we clear everything so each test starts from scratch.
  await Promise.all(db.tables.map((table) => table.clear()))
  localStorage.clear()
  await syncSeedExercises(db)
})

describe('Workout tab', () => {
  it('lists the routines and highlights the next one in the sequence', async () => {
    await importTestProgram(db)
    renderAt('/treino')

    const upperA = await screen.findByRole('button', { name: /Upper A/ })
    expect(upperA).toHaveTextContent('próximo da sequência')
    expect(screen.getByRole('button', { name: /Lower B/ })).not.toHaveTextContent(
      'próximo',
    )
  })

  it('starts Upper A with the planned sets and the reference', async () => {
    await importTestProgram(db)
    renderAt('/treino')

    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Upper A' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Cardio 15 min no final.')).toBeInTheDocument()
    expect(await screen.findByText('Referência: 25 kg × 8')).toBeInTheDocument()
    // 3+3+2+2+2+2+2 sets, each with its own complete button.
    expect(screen.getAllByRole('button', { name: /^Concluir série/ })).toHaveLength(16)
  })

  it('completing a set starts the rest timer', async () => {
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

  it('highlights the next set and the highlight moves on completing', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    const [firstCheck] = await screen.findAllByRole('button', {
      name: 'Concluir série 1',
    })
    // Only one set in the whole workout is "the next".
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

  it('free workout: adds an exercise via search', async () => {
    renderAt('/treino')

    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    expect(await screen.findByText('Treino vazio')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '+ Adicionar exercício' }))
    const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
    // findBy (not getBy): the exercise list loads from the database asynchronously.
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

describe('timer on screen', () => {
  it('the user starts the timer and finishes the workout from the card, with confirmation', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))

    const timer = await screen.findByRole('region', { name: 'Cronômetro' })
    expect(within(timer).getByText('Cronômetro não iniciado')).toBeInTheDocument()

    fireEvent.click(within(timer).getByRole('button', { name: 'Iniciar cronômetro' }))
    expect(await within(timer).findByText('Cronômetro rodando')).toBeInTheDocument()

    // Parar and Descansar are gone: only "Finalizar treino" remains (and there is no other on screen).
    expect(within(timer).queryByRole('button', { name: 'Parar' })).not.toBeInTheDocument()
    expect(
      within(timer).queryByRole('button', { name: 'Descansar' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Finalizar treino' })).toHaveLength(1)

    // Pausar freezes the clock; Retomar makes it run again.
    fireEvent.click(within(timer).getByRole('button', { name: 'Pausar' }))
    expect(await within(timer).findByText('Cronômetro pausado')).toBeInTheDocument()
    fireEvent.click(within(timer).getByRole('button', { name: 'Retomar' }))
    expect(await within(timer).findByText('Cronômetro rodando')).toBeInTheDocument()

    // Tapping opens the confirmation; "Cancelar" keeps the workout open.
    fireEvent.click(within(timer).getByRole('button', { name: 'Finalizar treino' }))
    const dialog = await screen.findByRole('dialog', { name: 'Finalizar treino?' })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(within(timer).getByText('Cronômetro rodando')).toBeInTheDocument()
  })
})

describe('timer that starts on its own', () => {
  it('completing the first set without tapping "Iniciar" starts the timer', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    const timer = await screen.findByRole('region', { name: 'Cronômetro' })

    const [firstCheck] = await screen.findAllByRole('button', { name: /^Concluir série/ })
    fireEvent.click(firstCheck)

    expect(await within(timer).findByText('Cronômetro rodando')).toBeInTheDocument()
    // "Finalizar treino" moves into the timer card: still only one on screen.
    expect(screen.getAllByRole('button', { name: 'Finalizar treino' })).toHaveLength(1)
  })
})

describe('finish confirmation', () => {
  /** Opens "Finalizar treino?" and returns the dialog. */
  async function openFinishDialog() {
    fireEvent.click(await screen.findByRole('button', { name: 'Finalizar treino' }))
    return screen.findByRole('dialog', { name: 'Finalizar treino?' })
  }

  it('says how many unmarked sets finishing discards', async () => {
    await importTestProgram(db)
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    const [firstCheck] = await screen.findAllByRole('button', { name: /^Concluir série/ })
    fireEvent.click(firstCheck)
    await screen.findByRole('button', { name: 'Desfazer série 1' })

    const dialog = await openFinishDialog()

    // Upper A has 16 planned sets: 1 completed, 15 left without ✓.
    expect(
      within(dialog).getByText(
        '1 série concluída. 15 séries não marcadas serão descartadas.',
      ),
    ).toBeInTheDocument()
  })

  it('with every set completed, does not mention discarding', async () => {
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: 'Treino livre' }))
    fireEvent.click(await screen.findByRole('button', { name: '+ Adicionar exercício' }))
    const picker = await screen.findByRole('dialog', { name: 'Adicionar exercício' })
    fireEvent.change(await within(picker).findByRole('searchbox'), {
      target: { value: 'supino reto' },
    })
    fireEvent.click(
      await within(picker).findByRole('button', { name: /Supino reto com barra/ }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Concluir série 1' }))
    await screen.findByRole('button', { name: 'Desfazer série 1' })

    const dialog = await openFinishDialog()

    expect(within(dialog).getByText('1 série concluída.')).toBeInTheDocument()
  })
})

describe('backup reminder on the Workout tab', () => {
  /** An already finished workout: now there is something to lose. */
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

  it('with workouts and no backup, reminds and goes to Settings', async () => {
    await importTestProgram(db)
    await addFinishedWorkout()
    const router = renderAt('/treino')

    expect(await screen.findByText(/Você ainda não fez backup/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Fazer backup' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/configuracoes'))
  })

  it('with a recent backup, does not bother', async () => {
    await importTestProgram(db)
    await addFinishedWorkout()
    await updateSettings(db, { lastBackupAt: Date.now() })
    renderAt('/treino')

    await screen.findByRole('button', { name: /Upper A/ })
    expect(screen.queryByRole('link', { name: 'Fazer backup' })).not.toBeInTheDocument()
  })
})

describe('exercise ⋯ menu', () => {
  it('"Remover exercício" asks for confirmation and removes the exercise from the workout', async () => {
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
    // The other exercises remain.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Puxada frontal' }),
    ).toBeInTheDocument()
  })
})

describe('sets: undo and double taps', () => {
  async function openUpperA() {
    await importTestProgram(db)
    // With the dock and the toasts (App.tsx provides them in the real app): "Desfazer" lives there.
    const router = createMemoryRouter(routes, { initialEntries: ['/treino'] })
    render(
      <BottomDockProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </BottomDockProvider>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    return screen.findAllByRole('button', { name: /^Concluir série/ })
  }

  it('deleting a set offers "Desfazer", which brings it back', async () => {
    const before = (await openUpperA()).length

    fireEvent.click(
      (await screen.findAllByRole('button', { name: /^Editar série 1/ }))[0],
    )
    const editor = await screen.findByRole('dialog', { name: /Série 1/ })
    fireEvent.click(within(editor).getByRole('button', { name: 'Excluir série' }))

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Concluir série/ })).toHaveLength(
        before - 1,
      ),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Desfazer' }))
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /^Concluir série/ })).toHaveLength(
        before,
      ),
    )
  })

  it('a double tap on ✓ leaves the set completed', async () => {
    const [firstCheck] = await openUpperA()
    // Freezes the clock (only `Date`; timers stay real so findBy still waits): the three taps
    // are 0 ms apart however slow the machine is. With the real clock, a busy test run could
    // take more than the 800 ms window between the taps, and the third one would count.
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      fireEvent.click(firstCheck)
      fireEvent.click(firstCheck)
      const undo = (await screen.findAllByRole('button', { name: 'Desfazer série 1' }))[0]
      // A tap right after completing is still the same double tap: ignored.
      fireEvent.click(undo)

      await new Promise((resolve) => setTimeout(resolve, 100))
      expect(
        (await screen.findAllByRole('button', { name: 'Desfazer série 1' }))[0],
      ).toBeInTheDocument()
      const completed = await db.setEntries
        .filter((set) => set.completedAt !== null)
        .count()
      expect(completed).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('rest per exercise', () => {
  /** Starts Upper A, completes the 1st bench press set and returns the rest bar. */
  async function completeFirstBenchSet() {
    renderAt('/treino')
    fireEvent.click(await screen.findByRole('button', { name: /Upper A/ }))
    const [firstCheck] = await screen.findAllByRole('button', {
      name: 'Concluir série 1',
    })
    fireEvent.click(firstCheck)
    return screen.findByRole('timer', { name: 'Descanso' })
  }

  it('uses the rest defined in the routine for that exercise', async () => {
    await importTestProgram(db)
    const [upperA] = await listRoutinesWithExercises(db)
    await updateRoutineExercise(db, upperA.items[0].id, { restSeconds: 180 })

    const timer = await completeFirstBenchSet()

    expect(within(timer).getByText('3:00')).toBeInTheDocument()
  })

  it('item saved before the field existed uses the Settings default', async () => {
    await importTestProgram(db)
    const [upperA] = await listRoutinesWithExercises(db)
    // Simulates the old record: without the restSeconds property.
    await db.routineExercises.update(upperA.items[0].id, { restSeconds: undefined })

    const timer = await completeFirstBenchSet()

    expect(within(timer).getByText('1:30')).toBeInTheDocument()
  })
})
