import { fireEvent, render, screen } from '@testing-library/react'
import { useState, type ComponentProps } from 'react'
import { describe, expect, it } from 'vitest'
import { TrainingCalendar } from './TrainingCalendar'

type Props = Omit<ComponentProps<typeof TrainingCalendar>, 'offset' | 'onOffsetChange'>

/** The screen keeps the month shown; here a small state does it. */
function Calendar(props: Props) {
  const [offset, setOffset] = useState(0)
  return <TrainingCalendar {...props} offset={offset} onOffsetChange={setOffset} />
}

const NOW = new Date(2026, 10, 23, 19, 0).getTime() // Monday, November 23, 2026

describe('TrainingCalendar', () => {
  it('fills in the trained days of the month and counts them', () => {
    render(
      <Calendar
        workouts={[
          { startedAt: new Date(2026, 10, 3, 18, 0).getTime() },
          { startedAt: new Date(2026, 10, 20, 23, 30).getTime() }, // late night: still the 20th
          { startedAt: new Date(2026, 9, 30, 18, 0).getTime() }, // October
        ]}
        now={NOW}
      />,
    )

    expect(screen.getByRole('heading', { name: 'novembro de 2026' })).toBeInTheDocument()
    expect(screen.getByText('2 treinos')).toBeInTheDocument()
    expect(screen.getByText(/3 de novembro: treinou/)).toBeInTheDocument()
    expect(screen.getByText(/20 de novembro: treinou/)).toBeInTheDocument()
    // The future cannot be browsed.
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled()
  })

  it('the arrows go back through the months', () => {
    render(
      <Calendar
        workouts={[{ startedAt: new Date(2026, 9, 30, 18, 0).getTime() }]}
        now={NOW}
      />,
    )
    expect(screen.getByText('0 treinos')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))

    expect(screen.getByRole('heading', { name: 'outubro de 2026' })).toBeInTheDocument()
    expect(screen.getByText('1 treino')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeEnabled()
  })
})
