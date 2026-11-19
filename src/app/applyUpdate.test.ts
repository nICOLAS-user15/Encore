import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyUpdate, UPDATE_RELOAD_FALLBACK_MS } from './applyUpdate'

/** O jsdom não tem service worker: um EventTarget imita o `navigator.serviceWorker`. */
let serviceWorker: EventTarget

beforeEach(() => {
  vi.useFakeTimers()
  serviceWorker = new EventTarget()
  Object.defineProperty(navigator, 'serviceWorker', {
    value: serviceWorker,
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'serviceWorker')
})

describe('applyUpdate', () => {
  it('recarrega quando o service worker novo assume o controle', async () => {
    const reload = vi.fn()
    // Quando a mensagem de "assumir" chega, o navegador troca o controlador.
    const updateServiceWorker = vi.fn(async () => {
      serviceWorker.dispatchEvent(new Event('controllerchange'))
    })

    await applyUpdate(updateServiceWorker, reload)
    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS)

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
    expect(reload).toHaveBeenCalledTimes(1) // uma vez só, mesmo com o tempo de segurança
  })

  it('recarrega mesmo se nada acontecer (nenhum worker esperando)', async () => {
    const reload = vi.fn()

    await applyUpdate(async () => {}, reload)
    expect(reload).not.toHaveBeenCalled()

    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('recarrega mesmo se o updateServiceWorker falhar', async () => {
    const reload = vi.fn()

    await applyUpdate(async () => {
      throw new Error('sem service worker')
    }, reload)
    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS)

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
