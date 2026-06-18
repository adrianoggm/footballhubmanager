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
}

export const authService = new AuthService()
