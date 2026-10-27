import { authService } from './authService.js'
import { claimService } from './claimService.js'
import { sessionStore } from './sessionStore.js'

export class AuthController {
  async loginUser(credentials) {
    const session = await authService.loginUser(credentials)
    sessionStore.setSession(session)
    return session
  }

  async loginAdmin(credentials) {
    const session = await authService.loginAdmin(credentials)
    sessionStore.setSession(session)
    return session
  }

  async registerUser(payload) {
    const session = await authService.registerUser(payload)
    sessionStore.setSession(session)
    return session
  }

  async registerAdmin(payload) {
    const session = await authService.registerAdmin(payload)
    sessionStore.setSession(session)
    return session
  }

  async claimPlayer(payload) {
    const session = await claimService.registerAndClaim(payload)
    sessionStore.setSession(session)
    return session
  }

  async logout() {
    try {
      await authService.logout()
    } catch {
      // Local logout must still succeed when server session is already expired.
    } finally {
      sessionStore.clear()
    }
  }

  async restore() {
    // Repopulate session metadata from the HttpOnly cookie on app load. A 401
    // (no/expired cookie) simply means "not logged in". Any other failure (429,
    // 5xx, network) says nothing about the session, so it is kept and the error
    // is rethrown for the caller to offer a retry.
    try {
      const session = await authService.session()
      sessionStore.setSession(session)
      return session
    } catch (error) {
      if (error?.status === 401) {
        sessionStore.clear()
        return null
      }
      throw error
    }
  }
}

export const authController = new AuthController()
