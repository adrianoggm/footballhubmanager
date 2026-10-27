/** @vitest-environment happy-dom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authControllerMock } = vi.hoisted(() => ({
  authControllerMock: { restore: vi.fn() },
}))

vi.mock('../services/authController.js', () => ({ authController: authControllerMock }))

import { useAuth } from './useAuth.js'

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })

describe('useAuth session restore (F5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('is logged out when the session check says 401', async () => {
    authControllerMock.restore.mockResolvedValue(null)
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.session).toBeNull()
  })

  it('reports the session as unavailable on other failures and can retry', async () => {
    authControllerMock.restore.mockRejectedValueOnce(httpError(503))
    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.status).toBe('unavailable'))

    const session = { user_guid: 'u1', user_type: 'user' }
    authControllerMock.restore.mockResolvedValueOnce(session)
    await act(async () => {
      await result.current.retryRestore()
    })

    expect(result.current.status).toBe('authenticated')
    expect(result.current.session).toEqual(session)
  })
})
