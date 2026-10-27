import { beforeEach, describe, expect, it, vi } from 'vitest'

const { authServiceMock } = vi.hoisted(() => ({
  authServiceMock: { session: vi.fn() },
}))

vi.mock('./authService.js', () => ({ authService: authServiceMock }))
vi.mock('./claimService.js', () => ({ claimService: {} }))

import { authController } from './authController.js'
import { sessionStore } from './sessionStore.js'

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })
const known = { user_guid: 'u1', user_type: 'user', expires_at: 123 }

describe('authController.restore (F5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStore.clear()
  })

  it('stores and returns the session when the cookie is valid', async () => {
    authServiceMock.session.mockResolvedValue(known)

    await expect(authController.restore()).resolves.toEqual(known)
    expect(sessionStore.getSession()).toEqual(known)
  })

  it('treats a 401 as logged out and clears the session', async () => {
    sessionStore.setSession(known)
    authServiceMock.session.mockRejectedValue(httpError(401))

    await expect(authController.restore()).resolves.toBeNull()
    expect(sessionStore.getSession()).toBeNull()
  })

  it.each([
    ['a server error', httpError(500)],
    ['rate limiting', httpError(429)],
    ['a network failure', new TypeError('Failed to fetch')],
  ])('does not clear the session on %s; it rejects so the caller can retry', async (_, error) => {
    sessionStore.setSession(known)
    authServiceMock.session.mockRejectedValue(error)

    await expect(authController.restore()).rejects.toBe(error)
    expect(sessionStore.getSession()).toEqual(known)
  })
})
