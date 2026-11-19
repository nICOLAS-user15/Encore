import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

/** Um wakeLock de mentira, para ver quando o hook pede e solta o bloqueio. */
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
  // Remove o mock: os outros testes rodam como num navegador sem a API.
  Reflect.deleteProperty(navigator, 'wakeLock')
})

describe('useWakeLock', () => {
  it('pede para manter a tela ligada e solta ao terminar', async () => {
    const { request, release } = mockWakeLock()

    const { unmount } = renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))

    unmount()
    await waitFor(() => expect(release).toHaveBeenCalled())
  })

  it('pede de novo quando o app volta a ficar visível', async () => {
    const { request } = mockWakeLock()
    renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })

  it('não faz nada se estiver desligado', () => {
    const { request } = mockWakeLock()

    renderHook(() => useWakeLock(false))

    expect(request).not.toHaveBeenCalled()
  })

  it('não quebra em navegador sem suporte', () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
  })
})
