import { httpClient } from './httpClient.js'

const API_V1 = '/api/v1'

/**
 * Public (unauthenticated) endpoints backing the "claim an existing guest player"
 * invitation flow. `inspectClaimToken` previews who the invitee is claiming;
 * `registerAndClaim` creates a brand-new account that adopts that guest player
 * (no duplicate profile) and returns a session payload.
 */
export class ClaimService {
  inspectClaimToken(token) {
    return httpClient.get(`${API_V1}/penas/link/claim/${encodeURIComponent(token)}`)
  }

  registerAndClaim({ token, username, password }) {
    return httpClient.post(`${API_V1}/penas/link/claim`, { token, username, password })
  }

  // Authenticated: an existing user merges the guest player into their own
  // profile (uses the current session token attached by httpClient).
  attachExistingAccount(token) {
    return httpClient.post(`${API_V1}/penas/link/claim/attach`, { token })
  }
}

export const claimService = new ClaimService()
