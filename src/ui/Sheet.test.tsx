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
  it('opens as a native <dialog>, with the title as its name', () => {
    renderSheet()

    const dialog = screen.getByRole('dialog', { name: 'Supino' })
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog).toHaveAttribute('open')
  })

  it('tapping outside the sheet closes it; tapping inside does not', () => {
    const { onClose } = renderSheet()

    fireEvent.click(screen.getByText('Conteúdo'))
    expect(onClose).not.toHaveBeenCalled()

    // The transparent area around the sheet is the <dialog> itself.
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('the ← "Voltar" arrow closes the sheet', () => {
    const { onClose } = renderSheet()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closed by the browser (Esc, back gesture) notifies the parent', () => {
    const { onClose } = renderSheet()

    fireEvent(screen.getByRole('dialog'), new Event('close'))

    expect(onClose).toHaveBeenCalled()
  })

  it('when closed, it does not show the content', () => {
    renderSheet(false)

    expect(screen.queryByText('Conteúdo')).not.toBeInTheDocument()
  })
})
