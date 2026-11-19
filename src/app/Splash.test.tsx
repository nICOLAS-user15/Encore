import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Splash, SPLASH_DURATION_MS } from './Splash'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Splash', () => {
  it('shows on open and disappears by itself after the animation', () => {
    vi.useFakeTimers()
    render(<Splash />)
    expect(screen.getByTestId('splash')).toBeInTheDocument()

    // `act` tells React that time has passed and it must update the screen.
    act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS))

    expect(screen.queryByTestId('splash')).not.toBeInTheDocument()
  })

  it('does not show for those who asked for "reduce motion"', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))

    render(<Splash />)

    expect(screen.queryByTestId('splash')).not.toBeInTheDocument()
  })
})
