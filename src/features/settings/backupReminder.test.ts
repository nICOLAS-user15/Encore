import { describe, expect, it } from 'vitest'
import { daysSince, needsBackupReminder, offersPostWorkoutBackup } from './backupReminder'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 18, 12)

describe('backup reminder', () => {
  it('counts whole days', () => {
    expect(daysSince(NOW - 2 * 60 * 60 * 1000, NOW)).toBe(0) // 2 hours ago
    expect(daysSince(NOW - DAY, NOW)).toBe(1)
    expect(daysSince(NOW - 20 * DAY - 1000, NOW)).toBe(20)
  })

  it('with no workout done, there is nothing to lose: no reminder', () => {
    expect(needsBackupReminder(null, 0, NOW)).toBe(false)
  })

  it('with workouts and no backup, it reminds', () => {
    expect(needsBackupReminder(null, 3, NOW)).toBe(true)
  })

  it('reminds from 14 days after the last backup', () => {
    expect(needsBackupReminder(NOW - 13 * DAY, 3, NOW)).toBe(false)
    expect(needsBackupReminder(NOW - 14 * DAY, 3, NOW)).toBe(true)
  })
})

describe('backup offer after a workout', () => {
  const now = 100 * DAY

  it('shows when there was never a backup or the last one is a week old', () => {
    expect(offersPostWorkoutBackup(null, now)).toBe(true)
    expect(offersPostWorkoutBackup(now - 7 * DAY, now)).toBe(true)
    expect(offersPostWorkoutBackup(now - 6 * DAY, now)).toBe(false)
  })
})
