import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BottomDockProvider, DockItem } from './BottomDock'

describe('BottomDock', () => {
  it('stacks two notices in the same container (one does not cover the other)', () => {
    render(
      <BottomDockProvider>
        <main>
          <DockItem>
            <p>Descanso</p>
          </DockItem>
          <DockItem>
            <p>Nova versão</p>
          </DockItem>
        </main>
      </BottomDockProvider>,
    )

    const rest = screen.getByText('Descanso')
    const update = screen.getByText('Nova versão')
    // Both left the <main> and went to the same dock, one below the other.
    expect(rest.parentElement).toBe(update.parentElement)
    expect(rest.closest('main')).toBeNull()
  })

  it('without a provider, the notice still shows up', () => {
    render(
      <DockItem>
        <p>Descanso</p>
      </DockItem>,
    )

    expect(screen.getByText('Descanso')).toBeInTheDocument()
  })
})
