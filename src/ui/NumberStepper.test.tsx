import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { NumberStepper } from './NumberStepper'

/** NumberStepper is "controlled": the test keeps the value in state, as the app will. */
function Harness({ initial, max }: { initial: number; max?: number }) {
  const [value, setValue] = useState(initial)
  return (
    <NumberStepper
      label="Carga"
      unit="kg"
      value={value}
      onChange={setValue}
      step={2.5}
      max={max}
    />
  )
}

const input = () => screen.getByRole('textbox', { name: 'Carga' })

describe('NumberStepper', () => {
  it('adds and subtracts the step', () => {
    render(<Harness initial={20} />)

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Carga' }))
    expect(input()).toHaveValue('22,5')

    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Carga' }))
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Carga' }))
    expect(input()).toHaveValue('17,5')
  })

  it('does not go past the min or max', () => {
    render(<Harness initial={1} max={2} />)

    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Carga' }))
    expect(input()).toHaveValue('0')
    expect(screen.getByRole('button', { name: 'Diminuir Carga' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Carga' }))
    expect(input()).toHaveValue('2')
    expect(screen.getByRole('button', { name: 'Aumentar Carga' })).toBeDisabled()
  })

  it('accepts typing with a comma', () => {
    render(<Harness initial={0} />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: '132,5' } })
    fireEvent.blur(input())

    expect(input()).toHaveValue('132,5')
  })

  it('ignores invalid text and goes back to the previous value', () => {
    render(<Harness initial={40} />)

    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'abc' } })
    fireEvent.blur(input())

    expect(input()).toHaveValue('40')
  })
})
