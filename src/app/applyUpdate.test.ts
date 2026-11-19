import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyUpdate, UPDATE_RELOAD_FALLBACK_MS } from './applyUpdate'

/** jsdom has no service worker: an EventTarget imitates `navigator.serviceWorker`. */
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
  it('reloads when the new service worker takes control', async () => {
    const reload = vi.fn()
    // When the "take over" message arrives, the browser swaps the controller.
    const updateServiceWorker = vi.fn(async () => {
      serviceWorker.dispatchEvent(new Event('controllerchange'))
    })

    await applyUpdate(updateServiceWorker, reload)
    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS)

    expect(updateServiceWorker).toHaveBeenCalledWith(true)
    expect(reload).toHaveBeenCalledTimes(1) // only once, even with the safety timeout
  })

  it('reloads even if nothing happens (no worker waiting)', async () => {
    const reload = vi.fn()

    await applyUpdate(async () => {}, reload)
    expect(reload).not.toHaveBeenCalled()

    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads even if updateServiceWorker fails', async () => {
    const reload = vi.fn()

    await applyUpdate(async () => {
      throw new Error('sem service worker')
    }, reload)
    vi.advanceTimersByTime(UPDATE_RELOAD_FALLBACK_MS)

    expect(reload).toHaveBeenCalledTimes(1)
  })
})
