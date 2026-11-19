import { describe, expect, it } from 'vitest'
import { translateNote } from './notes'

describe('translateNote', () => {
  it('translates the standard phrases to English', () => {
    expect(translateNote('Cardio 15 min no final.', 'en')).toBe(
      'Cardio 15 min at the end.',
    )
    expect(translateNote('Mobilidade antes de começar.', 'en')).toBe(
      'Mobility before starting.',
    )
    expect(translateNote('Carga por lado (40/40 kg).', 'en')).toBe(
      'Load per side (40/40 kg).',
    )
  })

  it('translates cardio on the treadmill', () => {
    expect(translateNote('Cardio na esteira: 15 min, 6 km/h, inclinação 2.', 'en')).toBe(
      'Treadmill cardio: 15 min, 6 km/h, incline 2.',
    )
  })

  it('does not touch free user text or Portuguese', () => {
    expect(translateNote('Aquecer bem o ombro', 'en')).toBe('Aquecer bem o ombro')
    expect(translateNote('Cardio 15 min no final.', 'pt')).toBe('Cardio 15 min no final.')
  })
})
