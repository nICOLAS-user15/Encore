import type { Timestamp } from '../../db/types'

/*
 * Backup reminder. Workouts live only on the device: switching phones or
 * clearing browser data wipes everything. A discreet reminder from time to
 * time is the cheapest defense against that.
 */

/** After how many days without a backup the reminder appears. */
export const BACKUP_REMINDER_DAYS = 14

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days since `since` (0 = less than 24h). */
export function daysSince(since: Timestamp, now: Timestamp): number {
  return Math.max(0, Math.floor((now - since) / DAY_MS))
}

/**
 * Show the reminder? Only when there is something to lose (at least one finished
 * workout) and there was never a backup, or the last one is 14 days old or more.
 */
export function needsBackupReminder(
  lastBackupAt: Timestamp | null,
  finishedWorkouts: number,
  now: Timestamp,
): boolean {
  if (finishedWorkouts === 0) {
    return false
  }
  return lastBackupAt === null || daysSince(lastBackupAt, now) >= BACKUP_REMINDER_DAYS
}

/**
 * After how many days without a backup the post-workout summary offers one. Shorter than
 * the list reminder: right after a workout the phone is in hand and there is something new
 * to protect.
 */
export const POST_WORKOUT_BACKUP_DAYS = 7

/** Offer a backup in the post-workout summary? Never backed up, or 7+ days ago. */
export function offersPostWorkoutBackup(
  lastBackupAt: Timestamp | null,
  now: Timestamp,
): boolean {
  return lastBackupAt === null || daysSince(lastBackupAt, now) >= POST_WORKOUT_BACKUP_DAYS
}
