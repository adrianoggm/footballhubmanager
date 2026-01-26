import { authService } from './authService.js'
import { sessionStore } from './sessionStore.js'

export class AuthController {
  async loginUser(credentials) {
    const session = await authService.loginUser(credentials)
    sessionStore.setToken(session.token)
    return session
  }

  async loginAdmin(credentials) {
    const session = await authService.loginAdmin(credentials)
    sessionStore.setToken(session.token)
    return session
  }

  async registerUser(payload) {
    const session = await authService.registerUser(payload)
    sessionStore.setToken(session.token)
    return session
  }

  async registerAdmin(payload) {
    const session = await authService.registerAdmin(payload)
    sessionStore.setToken(session.token)
    return session
  }

  async logout() {
    await authService.logout()
    sessionStore.clear()
  }
}

export const authController = new AuthController()
