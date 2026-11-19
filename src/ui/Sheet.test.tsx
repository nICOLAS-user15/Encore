import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from './Sheet'

function renderSheet(open = true) {
  const onClose = vi.fn()
  const view = render(
    <Sheet open={open} title="Supino" onClose={onClose}>
      <p>Conteúdo</p>
    </Sheet>,
  )
  return { onClose, ...view }
}

describe('Sheet', () => {
  it('abre como <dialog> nativo, com o título como nome', () => {
    renderSheet()

    const dialog = screen.getByRole('dialog', { name: 'Supino' })
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog).toHaveAttribute('open')
  })

  it('toque fora do painel fecha; toque dentro não', () => {
    const { onClose } = renderSheet()

    fireEvent.click(screen.getByText('Conteúdo'))
    expect(onClose).not.toHaveBeenCalled()

    // A área transparente em volta do painel é o próprio <dialog>.
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('a seta ← "Voltar" fecha o painel', () => {
    const { onClose } = renderSheet()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('fechado pelo navegador (Esc, gesto de voltar) avisa o pai', () => {
    const { onClose } = renderSheet()

    fireEvent(screen.getByRole('dialog'), new Event('close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('fechado, não mostra o conteúdo', () => {
    renderSheet(false)

    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument()
  })
})
