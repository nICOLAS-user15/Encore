import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnimatedNumber } from './AnimatedNumber'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AnimatedNumber', () => {
  it('shows the final value at once when matchMedia is unavailable', () => {
    render(<AnimatedNumber value={400} format={String} />)

    expect(screen.getByText('400')).toBeInTheDocument()
  })

  it('shows the final value at once with "reduce motion" on', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))

    render(<AnimatedNumber value={400} format={String} />)

    expect(screen.getByText('400')).toBeInTheDocument()
  })

  it('counts up from zero to the value when motion is allowed', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))

    render(<AnimatedNumber value={400} format={String} />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(await screen.findByText('400')).toBeInTheDocument()
  })
})
