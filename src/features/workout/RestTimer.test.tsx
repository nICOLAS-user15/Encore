import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playRestBeep } from '../../lib/beep'
import { RestTimer } from './RestTimer'

// Troca o módulo de som por uma versão falsa: o teste só verifica SE e QUANDO tocaria.
vi.mock('../../lib/beep', () => ({ playRestBeep: vi.fn(), unlockAudio: vi.fn() }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(playRestBeep).mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderTimer(sound: boolean) {
  const endsAt = Date.now() + 2_000
  render(
    <RestTimer endsAt={endsAt} sound={sound} onAdd={() => {}} onDismiss={() => {}} />,
  )
}

describe('RestTimer', () => {
  it('bipa uma vez quando o descanso acaba', () => {
    renderTimer(true)
    expect(screen.getByText('0:02')).toBeInTheDocument()
    expect(playRestBeep).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).toHaveBeenCalledTimes(1)

    // Continua na tela "acabou", mas não bipa de novo a cada segundo.
    act(() => vi.advanceTimersByTime(3_000))
    expect(playRestBeep).toHaveBeenCalledTimes(1)
  })

  it('não bipa com o som desligado', () => {
    renderTimer(false)

    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).not.toHaveBeenCalled()
  })

  it('uma barra que já nasce acabada não apita fora de hora', () => {
    render(
      <RestTimer
        endsAt={Date.now() - 1_000}
        sound
        onAdd={() => {}}
        onDismiss={() => {}}
      />,
    )

    act(() => vi.advanceTimersByTime(1_000))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).not.toHaveBeenCalled()
  })

  it('anuncia o fim do descanso para leitores de tela', () => {
    renderTimer(false)
    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('status')).toHaveTextContent('Descanso acabou')
  })
})
