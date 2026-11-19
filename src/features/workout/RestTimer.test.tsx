import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { playRestBeep } from '../../lib/beep'
import { RestTimer } from './RestTimer'

// Replaces the sound module with a fake: the test only checks IF and WHEN it would play.
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
  it('beeps once when the rest ends', () => {
    renderTimer(true)
    expect(screen.getByText('0:02')).toBeInTheDocument()
    expect(playRestBeep).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).toHaveBeenCalledTimes(1)

    // Stays on screen as "finished", but does not beep again every second.
    act(() => vi.advanceTimersByTime(3_000))
    expect(playRestBeep).toHaveBeenCalledTimes(1)
  })

  it('does not beep with the sound off', () => {
    renderTimer(false)

    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).not.toHaveBeenCalled()
  })

  it('a bar that is born already finished does not beep at the wrong time', () => {
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

  it('announces the end of the rest to screen readers', () => {
    renderTimer(false)
    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('status')).toHaveTextContent('Descanso acabou')
  })
})
