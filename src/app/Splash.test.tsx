import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Splash, SPLASH_DURATION_MS } from './Splash'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Splash', () => {
  it('plays only on the first opening of the day', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date(2026, 10, 23, 7, 0))
    const first = render(<Splash />)
    expect(screen.getByTestId('splash')).toBeInTheDocument()
    first.unmount()

    // Same day, a few hours later: straight to the app.
    vi.setSystemTime(new Date(2026, 10, 23, 21, 30))
    const again = render(<Splash />)
    expect(screen.queryByTestId('splash')).not.toBeInTheDocument()
    again.unmount()

    // Next day: it plays again.
    vi.setSystemTime(new Date(2026, 10, 24, 7, 0))
    render(<Splash />)
    expect(screen.getByTestId('splash')).toBeInTheDocument()
  })

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
