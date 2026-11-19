import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

/** A fake wakeLock, to see when the hook requests and releases the lock. */
function mockWakeLock() {
  const release = vi.fn(() => Promise.resolve())
  const request = vi.fn(() => Promise.resolve({ release }))
  Object.defineProperty(navigator, 'wakeLock', {
    value: { request },
    configurable: true,
  })
  return { request, release }
}

afterEach(() => {
  // Removes the mock: the other tests run as in a browser without the API.
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  it('requests to keep the screen on and releases it when done', async () => {
    const { request, release } = mockWakeLock()

    const { unmount } = renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))

    unmount()
    await waitFor(() => expect(release).toHaveBeenCalled())
  })

  it('requests again when the app becomes visible again', async () => {
    const { request } = mockWakeLock()
    renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })

  it('does nothing when disabled', () => {
    const { request } = mockWakeLock()

    renderHook(() => useWakeLock(false))

    expect(request).not.toHaveBeenCalled()
  })

  it('does not break in a browser without support', () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })
})
