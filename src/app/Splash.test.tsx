import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Splash, SPLASH_DURATION_MS } from './Splash'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Splash', () => {
  it('aparece ao abrir e some sozinha depois da animação', () => {
    vi.useFakeTimers()
    render(<Splash />)
    expect(screen.getByTestId('splash')).toBeInTheDocument()

    // `act` avisa o React que o tempo passou e ele deve atualizar a tela.
    act(() => vi.advanceTimersByTime(SPLASH_DURATION_MS))

    expect(screen.queryByTestId('splash')).not.toBeInTheDocument()
  })

  it('não aparece para quem pediu "reduzir movimento"', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
    }))

    render(<Splash />)

    expect(screen.queryByTestId('splash')).not.toBeInTheDocument()
  })
})
