import { authService } from './authService.js'
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

  async logout() {
    try {
      await authService.logout()
    } catch {
      // Local logout must still succeed when server session is already expired.
    } finally {
      sessionStore.clear()
    }
  }
}

export const authController = new AuthController()
