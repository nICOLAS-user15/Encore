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

describe('Sheet: drag the header down to close', () => {
  function drag(target: HTMLElement, distance: number) {
    fireEvent.touchStart(target, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchMove(target, { touches: [{ clientX: 100, clientY: 100 + distance }] })
    fireEvent.touchEnd(target, {
      changedTouches: [{ clientX: 100, clientY: 100 + distance }],
    })
  }

  it('a long drag down closes; a short one springs back', () => {
    const { onClose } = renderSheet()
    const header = screen.getByRole('heading', { name: 'Supino' })
      .parentElement as HTMLElement

    drag(header, 30)
    expect(onClose).not.toHaveBeenCalled()

    drag(header, 120)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('a mostly sideways gesture is not a dismiss', () => {
    const { onClose } = renderSheet()
    const header = screen.getByRole('heading', { name: 'Supino' })
      .parentElement as HTMLElement

    fireEvent.touchStart(header, { touches: [{ clientX: 100, clientY: 100 }] })
    fireEvent.touchEnd(header, { changedTouches: [{ clientX: 260, clientY: 190 }] })

    expect(onClose).not.toHaveBeenCalled()
  })
})
