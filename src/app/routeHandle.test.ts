import { describe, expect, it } from 'vitest'
import { FIRST_PAGE, isFirstPage, isJustFinished, justFinishedState } from './routeHandle'

describe('justFinishedState', () => {
  it('marks the redirect after finishing', () => {
    const state = justFinishedState({ key: 'abc', state: null })

    expect(isJustFinished({ state })).toBe(true)
    expect(isFirstPage({ key: 'new', state })).toBe(false)
  })

  it('keeps "first page" when it replaces the first page, so "Voltar" still knows', () => {
    const fromFirstPage = justFinishedState({ key: 'abc', state: FIRST_PAGE })
    const fromDefault = justFinishedState({ key: 'default', state: null })

    expect(isFirstPage({ key: 'new', state: fromFirstPage })).toBe(true)
    expect(isFirstPage({ key: 'new', state: fromDefault })).toBe(true)
  })

  it('a plain visit is not "just finished"', () => {
    expect(isJustFinished({ state: null })).toBe(false)
    expect(isJustFinished({ state: FIRST_PAGE })).toBe(false)
  })
})
