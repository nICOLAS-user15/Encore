import { describe, expect, it } from 'vitest'
import { daysSince, needsBackupReminder } from './backupReminder'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 18, 12)

describe('lembrete de backup', () => {
  it('conta dias inteiros', () => {
    expect(daysSince(NOW - 2 * 60 * 60 * 1000, NOW)).toBe(0) // 2 horas atrás
    expect(daysSince(NOW - DAY, NOW)).toBe(1)
    expect(daysSince(NOW - 20 * DAY - 1000, NOW)).toBe(20)
  })

  it('sem nenhum treino feito, não há o que perder: sem lembrete', () => {
    expect(needsBackupReminder(null, 0, NOW)).toBe(false)
  })

  it('com treinos e nenhum backup, lembra', () => {
    expect(needsBackupReminder(null, 3, NOW)).toBe(true)
  })

  it('lembra a partir de 14 dias desde o último backup', () => {
    expect(needsBackupReminder(NOW - 13 * DAY, 3, NOW)).toBe(false)
    expect(needsBackupReminder(NOW - 14 * DAY, 3, NOW)).toBe(true)
  })
})
