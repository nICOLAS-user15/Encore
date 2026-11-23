import { describe, expect, it } from 'vitest'
import { resolveWeeklyGoal, weeklyGoalProgress } from './weeklyGoal'

/** Local date at 18:00 (November 2026: the 23rd is a Monday). */
const at = (month: number, day: number) => new Date(2026, month, day, 18, 0).getTime()
const NOW = new Date(2026, 10, 25, 20, 0).getTime() // Wednesday, November 25

describe('weeklyGoalProgress', () => {
  it('counts this week from Monday', () => {
    const starts = [at(10, 22), at(10, 23), at(10, 25)] // Sunday (last week), Mon, Wed

    expect(weeklyGoalProgress(starts, 3, NOW)).toMatchObject({ done: 2, goal: 3 })
  })

  it('a week not met yet keeps the streak of the previous weeks alive', () => {
    const starts = [
      at(10, 9),
      at(10, 11),
      at(10, 13), // week of the 9th: 3
      at(10, 16),
      at(10, 18),
      at(10, 20), // week of the 16th: 3
      at(10, 23), // this week: 1 so far
    ]

    expect(weeklyGoalProgress(starts, 3, NOW).streakWeeks).toBe(2)
  })

  it('this week counts in the streak once the goal is met', () => {
    const starts = [at(10, 16), at(10, 18), at(10, 23), at(10, 24)]

    expect(weeklyGoalProgress(starts, 2, NOW).streakWeeks).toBe(2)
  })

  it('a missed week breaks the streak', () => {
    const starts = [
      at(10, 2),
      at(10, 4), // week of the 2nd: met
      at(10, 10), // week of the 9th: missed
      at(10, 16),
      at(10, 18), // week of the 16th: met
    ]

    expect(weeklyGoalProgress(starts, 2, NOW).streakWeeks).toBe(1)
  })

  it('with no workouts there is no streak', () => {
    expect(weeklyGoalProgress([], 3, NOW)).toEqual({ done: 0, goal: 3, streakWeeks: 0 })
  })
})

describe('resolveWeeklyGoal', () => {
  it('automatic: one workout per routine of the split (Upper/Lower with 4 = 4)', () => {
    expect(resolveWeeklyGoal(null, 4)).toBe(4)
    expect(resolveWeeklyGoal(null, 3)).toBe(3)
  })

  it('automatic stays within a week (at most 7) and has a fallback with no routines', () => {
    expect(resolveWeeklyGoal(null, 9)).toBe(7)
    expect(resolveWeeklyGoal(null, 0)).toBe(3)
  })

  it('a goal chosen in Settings wins', () => {
    expect(resolveWeeklyGoal(5, 4)).toBe(5)
  })
})
