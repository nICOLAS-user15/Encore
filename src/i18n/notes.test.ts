import { describe, expect, it } from 'vitest'
import { translateNote } from './notes'

describe('translateNote', () => {
  it('traduz as frases padrão para o inglês', () => {
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

  it('traduz o cardio na esteira', () => {
    expect(translateNote('Cardio na esteira: 15 min, 6 km/h, inclinação 2.', 'en')).toBe(
      'Treadmill cardio: 15 min, 6 km/h, incline 2.',
    )
  })

  it('não mexe em texto livre do usuário nem em português', () => {
    expect(translateNote('Aquecer bem o ombro', 'en')).toBe('Aquecer bem o ombro')
    expect(translateNote('Cardio 15 min no final.', 'pt')).toBe('Cardio 15 min no final.')
  })
})
