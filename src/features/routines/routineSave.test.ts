import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDatabase, type EncoreDB } from '../../db/db'
import { SEED_EXERCISES, syncSeedExercises } from '../../db/seed'
import { createSplit } from '../splits/splitActions'
import {
  blankDraft,
  draftFromRoutine,
  isDraftDirty,
  moveDraftItem,
  newDraftItem,
  updateDraftItem,
  type RoutineDraft,
} from './routineDraft'
import { saveRoutine } from './routineActions'
import { getRoutineWithExercises, listRoutinesWithExercises } from './routineQueries'

const [bench, incline, fly] = SEED_EXERCISES.map((seed) => seed.id)

let db: EncoreDB
let splitId: string

beforeEach(async () => {
  db = createDatabase(`encore-test-${crypto.randomUUID()}`)
  await syncSeedExercises(db)
  splitId = await createSplit(db, 'PPL')
})

afterEach(async () => {
  await db.delete()
})

/** Creates a routine through the same path as the Save button. */
async function create(name: string, exercises: string[] = [], position = 99) {
  const draft: RoutineDraft = {
    ...blankDraft(splitId, position),
    name,
    items: exercises.map((exerciseId) => newDraftItem(exerciseId)),
  }
  return saveRoutine(db, null, draft)
}

/** The draft of an existing routine, as the screen builds it on open. */
async function draftOf(routineId: string): Promise<RoutineDraft> {
  const entry = await getRoutineWithExercises(db, routineId)
  const all = await listRoutinesWithExercises(db)
  const siblings = all.filter((item) => item.routine.splitId === entry!.routine.splitId)
  const position = siblings.findIndex((item) => item.routine.id === routineId)
  return draftFromRoutine(entry!.routine, entry!.items, position)
}

describe('saveRoutine: new routine', () => {
  it('only exists after saving, already with the exercises in draft order', async () => {
    expect(await db.routines.count()).toBe(0)

    const id = await create('  Push  ', [bench, incline])

    const entry = await getRoutineWithExercises(db, id)
    expect(entry?.routine).toMatchObject({ name: 'Push', splitId, notes: '' })
    expect(entry?.items.map((item) => [item.position, item.exerciseId])).toEqual([
      [0, bench],
      [1, incline],
    ])
    // Default target for new items: 3 × 8–12, "default" rest (null).
    expect(entry?.items[0]).toMatchObject({
      targetSets: 3,
      targetRepsMin: 8,
      targetRepsMax: 12,
      restSeconds: null,
    })
  })

  it('stores the notes and takes the requested position', async () => {
    await create('Push', [], 0)
    await create('Pull', [], 1)

    const id = await saveRoutine(db, null, {
      ...blankDraft(splitId, 1),
      name: 'Legs',
      notes: 'Mobilidade antes',
    })

    const names = (await listRoutinesWithExercises(db)).map((entry) => entry.routine.name)
    expect(names).toEqual(['Push', 'Legs', 'Pull'])
    expect((await getRoutineWithExercises(db, id))?.routine.notes).toBe(
      'Mobilidade antes',
    )
  })
})

describe('saveRoutine: existing routine', () => {
  it('applies name, removed, new, edited and reordered exercises at once', async () => {
    const id = await create('Push', [bench, incline])
    const draft = await draftOf(id)
    const [benchItem, inclineItem] = draft.items

    const edited: RoutineDraft = {
      ...draft,
      name: 'Push A',
      items: [
        newDraftItem(fly), // new, at the front
        updateDraftItem([inclineItem], inclineItem.key, { targetSets: 5 })[0], // edited, moves up
        // `benchItem` left the draft: it will be deleted.
      ],
    }
    expect(benchItem.id).toBeDefined()

    await saveRoutine(db, id, edited)

    const entry = await getRoutineWithExercises(db, id)
    expect(entry?.routine.name).toBe('Push A')
    expect(
      entry?.items.map((item) => [item.position, item.exerciseId, item.targetSets]),
    ).toEqual([
      [0, fly, 3],
      [1, incline, 5],
    ])
    // The removed one was soft deleted (so it can be synced).
    expect((await db.routineExercises.get(benchItem.id!))?.deletedAt).toBeTypeOf('number')
    // The edited one is the SAME record (it was not recreated).
    expect(entry?.items[1].id).toBe(inclineItem.id)
  })

  it('does not touch what did not change (updatedAt stays the same)', async () => {
    const id = await create('Push', [bench])
    const before = await getRoutineWithExercises(db, id)

    await saveRoutine(db, id, await draftOf(id)) // save without changing anything

    const after = await getRoutineWithExercises(db, id)
    expect(after?.routine.updatedAt).toBe(before?.routine.updatedAt)
    expect(after?.items[0].updatedAt).toBe(before?.items[0].updatedAt)
  })

  it('changes the position in the sequence of the split', async () => {
    const a = await create('A', [], 0)
    await create('B', [], 1)
    const c = await create('C', [], 2)

    // C moves up to the first position.
    await saveRoutine(db, c, { ...(await draftOf(c)), position: 0 })

    expect(
      (await listRoutinesWithExercises(db)).map((entry) => entry.routine.name),
    ).toEqual(['C', 'A', 'B'])
    expect(a).toBeDefined()
  })

  it('changes split: goes to the requested position in the new one, and the old one stays in order', async () => {
    const ul = await createSplit(db, 'Upper / Lower')
    const push = await create('Push', [], 0)
    await create('Pull', [], 1)
    const upperDraft = { ...blankDraft(ul, 0), name: 'Upper' }
    await saveRoutine(db, null, upperDraft)

    // Push goes to Upper / Lower, in front of Upper.
    await saveRoutine(db, push, { ...(await draftOf(push)), splitId: ul, position: 0 })

    const all = await listRoutinesWithExercises(db)
    const names = (id: string) =>
      all
        .filter((entry) => entry.routine.splitId === id)
        .map((entry) => entry.routine.name)
    expect(names(ul)).toEqual(['Push', 'Upper'])
    expect(names(splitId)).toEqual(['Pull'])
    // The DESTINATION split is renumbered 0, 1, 2... The source one just loses the routine:
    // a "gap" in the numbering changes nothing, because only the relative order matters.
    expect(
      all.filter((entry) => entry.routine.splitId === ul).map((e) => e.routine.order),
    ).toEqual([0, 1])
  })

  it('refuses to save a routine that no longer exists (and creates nothing)', async () => {
    const before = await db.routines.count()

    await expect(
      saveRoutine(db, 'nao-existe', { ...blankDraft(splitId, 0), name: 'Fantasma' }),
    ).rejects.toThrow('not found')

    expect(await db.routines.count()).toBe(before)
  })
})

describe('draft (pure rules)', () => {
  it('isDraftDirty detects any change, and goes back to "clean" if the user undoes it', () => {
    const initial = blankDraft(splitId, 0)
    expect(isDraftDirty(initial, initial)).toBe(false)
    expect(isDraftDirty({ ...initial, name: 'Push' }, initial)).toBe(true)
    expect(isDraftDirty({ ...initial, name: '' }, initial)).toBe(false)
    expect(isDraftDirty({ ...initial, items: [newDraftItem(bench)] }, initial)).toBe(true)
  })

  it('moveDraftItem swaps with the neighbor and ignores the ends', () => {
    const items = [newDraftItem(bench), newDraftItem(incline), newDraftItem(fly)]

    expect(moveDraftItem(items, 1, -1).map((item) => item.exerciseId)).toEqual([
      incline,
      bench,
      fly,
    ])
    expect(moveDraftItem(items, 0, -1)).toBe(items) // already the first
    expect(moveDraftItem(items, 2, 1)).toBe(items) // already the last
  })

  it('updateDraftItem keeps the rep range consistent (min ≤ max)', () => {
    const [item] = [newDraftItem(bench)] // 8–12
    const up = updateDraftItem([item], item.key, { targetRepsMin: 15 })[0]
    expect([up.targetRepsMin, up.targetRepsMax]).toEqual([15, 15])
    const down = updateDraftItem([item], item.key, { targetRepsMax: 5 })[0]
    expect([down.targetRepsMin, down.targetRepsMax]).toEqual([5, 5])
  })

  it('draftFromRoutine covers old items, without the rest field', async () => {
    const id = await create('Push', [bench])
    // Record as it was before the field existed.
    const [item] = (await getRoutineWithExercises(db, id))!.items
    await db.routineExercises.update(item.id, { restSeconds: undefined })

    const draft = await draftOf(id)

    expect(draft.items[0].restSeconds).toBeNull()
  })
})
