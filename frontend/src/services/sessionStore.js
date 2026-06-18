const LEGACY_TOKEN_KEY = 'penahub.session.token'
const LEGACY_SESSION_KEY = 'penahub.session.payload'

// The session token now lives only in an HttpOnly cookie. This store keeps just
// the non-sensitive metadata (role/guid) in memory for routing; it is repopulated
// from GET /auth/session on reload.
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
  getSession() {
    return currentSession
  },
  setSession(session) {
    if (!session?.user_type) {
      return
    }
    currentSession = {
      user_guid: session.user_guid,
      user_type: session.user_type,
      expires_at: session.expires_at,
    }
    clearLegacyStorage()
  },
  clear() {
    currentSession = null
    clearLegacyStorage()
  },
}
