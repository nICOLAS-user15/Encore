import { afterEach, describe, expect, it, vi } from 'vitest'
import { goToStartPage, shouldGoToStartPage } from './startPage'

afterEach(() => {
  vi.restoreAllMocks()
  window.history.replaceState(null, '', '/')
})

/** Finge o tipo de navegação que o navegador informaria. */
function fakeNavigation(type: string) {
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([
    { type } as unknown as PerformanceEntry,
  ])
}

describe('página inicial', () => {
  it('abrir o app (ou voltar de outro site) vai para o Treino; recarregar não', () => {
    expect(shouldGoToStartPage('navigate')).toBe(true)
    expect(shouldGoToStartPage('back_forward')).toBe(true)
    expect(shouldGoToStartPage(undefined)).toBe(true)
    expect(shouldGoToStartPage('reload')).toBe(false)
  })

  it('ao abrir numa página antiga, troca a URL para /treino', () => {
    window.history.replaceState(null, '', '/historico')
    fakeNavigation('navigate')

    goToStartPage()

    expect(window.location.pathname).toBe('/treino')
  })

  it('ao recarregar, fica onde estava', () => {
    window.history.replaceState(null, '', '/historico')
    fakeNavigation('reload')

    goToStartPage()

    expect(window.location.pathname).toBe('/historico')
  })
})
