import { httpClient } from './httpClient.js'

const TOKEN_KEY = 'penahub.session.token'
const SESSION_KEY = 'penahub.session.payload'

const parseSession = (value) => {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export const sessionStore = {
  getToken() {
    const session = this.getSession()
    if (session?.token) {
      return session.token
    }
    return localStorage.getItem(TOKEN_KEY)
  },
  getSession() {
    return parseSession(localStorage.getItem(SESSION_KEY))
  },
  setSession(session) {
    if (!session?.token) {
      return
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    localStorage.setItem(TOKEN_KEY, session.token)
    httpClient.setSessionToken(session.token)
  },
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
      httpClient.setSessionToken(token)
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
    httpClient.setSessionToken(null)
  },
  init() {
    const session = this.getSession()
    if (session?.token) {
      httpClient.setSessionToken(session.token)
      return
    }
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      this.setToken(token)
    }
  },
}
