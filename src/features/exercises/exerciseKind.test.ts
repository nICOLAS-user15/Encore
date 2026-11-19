import { describe, expect, it } from 'vitest'
import { EQUIPMENT } from '../../db/types'
import { exerciseKind } from './exerciseKind'

describe('exerciseKind', () => {
  it('máquina e polia são "máquinas"; o resto é "livre"', () => {
    const kinds = Object.fromEntries(EQUIPMENT.map((item) => [item, exerciseKind(item)]))

    expect(kinds).toEqual({
      barbell: 'free',
      dumbbell: 'free',
      kettlebell: 'free',
      bodyweight: 'free',
      machine: 'machine',
      cable: 'machine',
    })
  })
})
