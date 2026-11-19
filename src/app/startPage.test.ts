import { afterEach, describe, expect, it, vi } from 'vitest'
import { goToStartPage, shouldGoToStartPage } from './startPage'

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

/** Fakes the navigation type the browser would report. */
function fakeNavigation(type: string) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type } as unknown as PerformanceEntry,
  ])
}

describe('start page', () => {
  it('opening the app (or coming back from another site) goes to Treino; reloading does not', () => {
    expect(shouldGoToStartPage('navigate')).toBe(true)
    expect(shouldGoToStartPage('back_forward')).toBe(true)
    expect(shouldGoToStartPage(undefined)).toBe(true)
    expect(shouldGoToStartPage('reload')).toBe(false)
  })

  it('when opening on an old page, switches the URL to /treino', () => {
    window.history.replaceState(null, '', '/historico')
    fakeNavigation('navigate')

    goToStartPage()

    expect(window.location.pathname).toBe('/treino')
  })

  it('when reloading, stays where it was', () => {
    window.history.replaceState(null, '', '/historico')
    fakeNavigation('reload')

    goToStartPage()

    expect(window.location.pathname).toBe('/historico')
  })
})
