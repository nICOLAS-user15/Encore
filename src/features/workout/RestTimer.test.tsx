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
  return render(
    <RestTimer endsAt={endsAt} sound={sound} onAdd={() => {}} onDismiss={() => {}} />,
  )
}

describe('RestTimer', () => {
  it('beeps when the rest ends, repeats every 4 s a few times, then stops', () => {
    renderTimer(true)
    expect(screen.getByText('0:02')).toBeInTheDocument()
    expect(playRestBeep).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).toHaveBeenCalledTimes(1)

    // Not every second: the next alert comes 4 s later.
    act(() => vi.advanceTimersByTime(3_000))
    expect(playRestBeep).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(1_000))
    expect(playRestBeep).toHaveBeenCalledTimes(2)

    // 1 + 3 repeats, then silence, even with the bar still on screen.
    act(() => vi.advanceTimersByTime(60_000))
    expect(playRestBeep).toHaveBeenCalledTimes(4)
  })

  it('dismissing the bar stops the repeated alerts', () => {
    const { unmount } = renderTimer(true)
    act(() => vi.advanceTimersByTime(2_500))
    expect(playRestBeep).toHaveBeenCalledTimes(1)

    unmount() // "OK" / "Pular" remove the bar

    act(() => vi.advanceTimersByTime(20_000))
    expect(playRestBeep).toHaveBeenCalledTimes(1)
  })

  it('flashes the screen once when the rest ends', () => {
    renderTimer(false)
    const flash = screen.getByTestId('rest-flash')
    expect(flash).not.toHaveClass('animate-flash')

    act(() => vi.advanceTimersByTime(2_500))

    expect(flash).toHaveClass('animate-flash')
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

    act(() => vi.advanceTimersByTime(10_000))

    expect(screen.getByRole('timer')).toHaveTextContent('Descanso acabou')
    expect(playRestBeep).not.toHaveBeenCalled()
    expect(screen.getByTestId('rest-flash')).not.toHaveClass('animate-flash')
  })

  it('announces the end of the rest to screen readers', () => {
    renderTimer(false)
    act(() => vi.advanceTimersByTime(2_500))

    expect(screen.getByRole('status')).toHaveTextContent('Descanso acabou')
  })
})
