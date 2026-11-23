import { describe, expect, it } from 'vitest'
import { bodyWeightSummary } from './bodyWeightStats'

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date(2026, 10, 23, 8, 0).getTime()
const daysAgo = (days: number, weightKg: number) => ({
  measuredAt: NOW - days * DAY,
  weightKg,
})

describe('bodyWeightSummary', () => {
  it('averages the last 7 days and compares with the 7 days before', () => {
    const entries = [
      daysAgo(12, 83.0),
      daysAgo(9, 82.6), // the 7 days before: average 82.8
      daysAgo(5, 82.4),
      daysAgo(3, 82.0),
      daysAgo(0, 81.9), // last 7 days: average 82.1
    ]

    expect(bodyWeightSummary(entries, NOW)).toEqual({
      latestKg: 81.9,
      weekAverageKg: 82.1,
      weekChangeKg: -0.7,
    })
  })

  it('without a measurement in the week before, there is no change yet', () => {
    expect(bodyWeightSummary([daysAgo(1, 80)], NOW)).toEqual({
      latestKg: 80,
      weekAverageKg: 80,
      weekChangeKg: null,
    })
  })

  it('an old measurement is still the latest, but there is no recent average', () => {
    expect(bodyWeightSummary([daysAgo(30, 85)], NOW)).toEqual({
      latestKg: 85,
      weekAverageKg: null,
      weekChangeKg: null,
    })
  })

  it('with no measurements, everything is empty', () => {
    expect(bodyWeightSummary([], NOW)).toEqual({
      latestKg: null,
      weekAverageKg: null,
      weekChangeKg: null,
    })
  })
})
