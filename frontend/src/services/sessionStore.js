import { httpClient } from './httpClient.js'

const TOKEN_KEY = 'penahub.session.token'

export const sessionStore = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      httpClient.setSessionToken(token)
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    httpClient.setSessionToken(null)
  },
  init() {
    const token = this.getToken()
    if (token) {
      httpClient.setSessionToken(token)
    }
  }
}
