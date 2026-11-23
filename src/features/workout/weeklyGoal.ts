import type { Timestamp } from '../../db/types'
import { startOfWeek } from '../history/weeklyVolume'

/*
 * Weekly goal ("N workouts a week") and the streak of weeks that met it. Weeks are
 * Monday to Sunday, like the weekly volume. Pure functions: the screen only draws.
 */

export type WeeklyGoalProgress = {
  /** Finished workouts this week. */
  done: number
  goal: number
  /**
   * Weeks in a row that met the goal. The current week only counts once it is met;
   * until then, the streak of the previous weeks is still alive (the week is not over).
   */
  streakWeeks: number
}

/** Goal when there is no split to count from (no routines yet). */
const FALLBACK_GOAL = 3

/**
 * The goal in use: the one chosen in Settings, or, on automatic (`null`), one workout per
 * routine of the chosen split (Upper/Lower with 4 routines = 4 a week), kept within 1 to 7.
 */
export function resolveWeeklyGoal(
  chosen: number | null,
  routinesInSplit: number,
): number {
  if (chosen !== null) {
    return chosen
  }
  return routinesInSplit === 0 ? FALLBACK_GOAL : Math.min(7, routinesInSplit)
}

/** The Monday before `weekStart` (going back one millisecond lands in the previous week). */
function previousWeek(weekStart: Timestamp): Timestamp {
  return startOfWeek(weekStart - 1)
}

export function weeklyGoalProgress(
  workoutStarts: Timestamp[],
  goal: number,
  now: Timestamp,
): WeeklyGoalProgress {
  const perWeek = new Map<Timestamp, number>()
  for (const startedAt of workoutStarts) {
    const week = startOfWeek(startedAt)
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1)
  }

  const thisWeek = startOfWeek(now)
  const done = perWeek.get(thisWeek) ?? 0
  let streakWeeks = done >= goal ? 1 : 0
  for (let week = previousWeek(thisWeek); (perWeek.get(week) ?? 0) >= goal;) {
    streakWeeks++
    week = previousWeek(week)
  }
  return { done, goal, streakWeeks }
}
