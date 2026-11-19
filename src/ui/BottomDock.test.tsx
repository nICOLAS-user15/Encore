import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BottomDockProvider, DockItem } from './BottomDock'

describe('BottomDock', () => {
  it('empilha dois avisos no mesmo container (um não cobre o outro)', () => {
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
    // Os dois saíram do <main> e foram para a mesma doca, um embaixo do outro.
    expect(rest.parentElement).toBe(update.parentElement)
    expect(rest.closest('main')).toBeNull()
  })

  it('sem provider, o aviso aparece mesmo assim', () => {
    render(
      <DockItem>
        <p>Descanso</p>
      </DockItem>,
    )

    expect(screen.getByText('Descanso')).toBeInTheDocument()
  })
})
