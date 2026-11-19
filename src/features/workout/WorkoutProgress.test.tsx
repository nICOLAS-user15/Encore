import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WorkoutProgress } from './WorkoutProgress'

describe('WorkoutProgress', () => {
  it('exposes the done/total sets as a progressbar', () => {
    render(<WorkoutProgress done={3} total={12} />)

    const bar = screen.getByRole('progressbar', {
      name: 'Progresso do treino: 3 de 12 séries',
    })
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemax', '12')
  })

  it('renders nothing when there are no working sets', () => {
    render(<WorkoutProgress done={0} total={0} />)

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})
