import { httpClient } from './httpClient.js'

const LEGACY_TOKEN_KEY = 'penahub.session.token'
const LEGACY_SESSION_KEY = 'penahub.session.payload'

let currentSession = null

const clearLegacyStorage = () => {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    localStorage.removeItem(LEGACY_SESSION_KEY)
  } catch {
    // Storage may be unavailable in private or embedded browser contexts.
  }
}

export const sessionStore = {
  getToken() {
    return currentSession?.token ?? null
  },
  getSession() {
    return currentSession
  },
  setSession(session) {
    if (!session?.token) {
      return
    }
    currentSession = session
    clearLegacyStorage()
    httpClient.setSessionToken(session.token)
  },
  setToken(token) {
    if (token) {
      currentSession = { token }
      clearLegacyStorage()
      httpClient.setSessionToken(token)
    }
  },
  clear() {
    currentSession = null
    clearLegacyStorage()
    httpClient.setSessionToken(null)
  },
  init() {
    clearLegacyStorage()
    if (currentSession?.token) {
      httpClient.setSessionToken(currentSession.token)
    }
  },
}
