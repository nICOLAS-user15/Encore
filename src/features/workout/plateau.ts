import type { SetEntry } from '../../db/types'
import { estimateOneRepMax } from '../../lib/oneRepMax'

/*
 * Plateau detection. Double progression works for months, then an exercise stalls. When
 * the last 3 sessions did not beat the best estimated 1RM before them, the app says so:
 * - with reps still in reserve (RIR 2+ on the last session's top sets): push harder first;
 * - otherwise (near failure, or no RIR logged): a deload, -10% for one session.
 * Pure functions: the screen reads the sessions, the tests cover every case.
 */

type SessionSet = Pick<SetEntry, 'type' | 'weightKg' | 'reps' | 'rir'>

export type PlateauAdvice =
  /** A lighter session: the pending planned sets go to this load (Aplicar). */
  | { kind: 'deload'; weightKg: number; reps: number }
  /** Stalled with reps left in the tank: no deload yet, just more effort. */
  | { kind: 'push' }

/** Sessions in a row without beating the best before them. */
export const PLATEAU_SESSIONS = 3
/** Deload: this fraction of the last top load. */
const DELOAD_FACTOR = 0.9
/** A session under this fraction of the heaviest load before it was a deload: not a stall. */
const LIGHT_SESSION_FACTOR = 0.95
/** RIR from which the lifter still had reps to give. */
const RESERVE_RIR = 2

type Summary = {
  topWeight: number
  fewestTopReps: number
  best: number
  topRir: number[]
}

function summarize(sets: SessionSet[]): Summary | null {
  const planned = sets.filter((set) => set.type === 'normal')
  if (planned.length === 0) {
    return null
  }
  const topWeight = Math.max(...planned.map((set) => set.weightKg))
  const top = planned.filter((set) => set.weightKg === topWeight)
  return {
    topWeight,
    fewestTopReps: Math.min(...top.map((set) => set.reps)),
    best: Math.max(...planned.map((set) => estimateOneRepMax(set.weightKg, set.reps))),
    topRir: top.flatMap((set) => (set.rir == null ? [] : [set.rir])),
  }
}

/**
 * Advice for today from the previous sessions of an exercise (oldest first, each with its
 * completed sets; warm-up and encore are ignored). `null` = no plateau, not enough
 * history, or bodyweight (`stepKg = null`, progress in reps only).
 */
export function detectPlateau(
  sessions: SessionSet[][],
  stepKg: number | null,
): PlateauAdvice | null {
  if (stepKg === null) {
    return null
  }
  // Drop deload sessions (clearly lighter than the heaviest before them): they are planned
  // dips, not stalls, and would otherwise trigger the advice right after a deload.
  const kept: Summary[] = []
  let heaviest = 0
  for (const sets of sessions) {
    const summary = summarize(sets)
    if (!summary || summary.topWeight <= 0) {
      continue
    }
    if (summary.topWeight < heaviest * LIGHT_SESSION_FACTOR) {
      continue
    }
    heaviest = Math.max(heaviest, summary.topWeight)
    kept.push(summary)
  }
  if (kept.length <= PLATEAU_SESSIONS) {
    return null
  }

  const recent = kept.slice(-PLATEAU_SESSIONS)
  const bestBefore = Math.max(...kept.slice(0, -PLATEAU_SESSIONS).map((s) => s.best))
  if (Math.max(...recent.map((s) => s.best)) > bestBefore) {
    return null
  }

  const last = recent[recent.length - 1]
  if (last.topRir.length > 0 && last.topRir.every((rir) => rir >= RESERVE_RIR)) {
    return { kind: 'push' }
  }
  // Rounded DOWN to the equipment step (a deload that rounds up is not a deload).
  const weightKg =
    Math.round(Math.floor((last.topWeight * DELOAD_FACTOR) / stepKg) * stepKg * 100) / 100
  return { kind: 'deload', weightKg, reps: last.fewestTopReps }
}
