import { httpClient } from './httpClient.js'

export class AuthService {
  async loginUser({ username, password }) {
    return httpClient.post('/api/v1/auth/login', { username, password })
  }

  async loginAdmin({ username, password }) {
    return httpClient.post('/api/v1/auth/admin/login', { username, password })
  }

  async registerUser(payload) {
    return httpClient.post('/api/v1/auth/register', payload)
  }

  async registerAdmin(payload) {
    return httpClient.post('/api/v1/auth/admin/register', payload)
  }

  async logout() {
    return httpClient.post('/api/v1/auth/logout', {})
  }

  async session() {
    return httpClient.get('/api/v1/auth/session')
  }

  async getAccountEmail() {
    return httpClient.get('/api/v1/auth/me/email')
  }

  async changeAccountEmail({ email, lang }) {
    return httpClient.put('/api/v1/auth/me/email', { email, lang })
  }

  async resendEmailVerification({ lang }) {
    return httpClient.post('/api/v1/auth/me/email/verification', { lang })
  }

  async verifyEmail(token) {
    return httpClient.post('/api/v1/auth/email/verify', { token })
  }

  async forgotPassword({ email, lang }) {
    return httpClient.post('/api/v1/auth/password/forgot', { email, lang })
  }

  // POST rather than GET /reset/{token}: keeps the token out of server access logs.
  async inspectPasswordResetToken(token) {
    return httpClient.post('/api/v1/auth/password/reset/inspect', { token })
  }

  async resetPassword({ token, newPassword }) {
    return httpClient.post('/api/v1/auth/password/reset', { token, new_password: newPassword })
  }
}

export const authService = new AuthService()
