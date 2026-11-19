import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeeklyVolumeCard } from './WeeklyVolumeCard'

describe('WeeklyVolumeCard', () => {
  it('lists the muscle groups with volume and sets, and the week total', () => {
    render(
      <WeeklyVolumeCard
        volumes={[
          { muscleGroup: 'chest', volumeKg: 1440, sets: 2 },
          { muscleGroup: 'back', volumeKg: 0, sets: 3 },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Esta semana' })).toBeInTheDocument()
    expect(screen.getByText('1.440 kg')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Volume da semana por grupo muscular' })
    const [chest, back] = within(list).getAllByRole('listitem')
    expect(chest).toHaveTextContent('Peito')
    expect(chest).toHaveTextContent('1.440 kg · 2 séries')
    // Bodyweight work: sets only, no "0 kg".
    expect(back).toHaveTextContent('3 séries')
    expect(back).not.toHaveTextContent('0 kg')
  })

  it('says when nothing was trained this week', () => {
    render(<WeeklyVolumeCard volumes={[]} />)

    expect(screen.getByText('Nenhum treino nesta semana ainda.')).toBeInTheDocument()
  })
})
