import { httpClient } from './httpClient.js'
import { normalizeNationalities } from './catalogUtils.js'

const API_V1 = '/api/v1'

export class UserService {
  getMyProfile() {
    return httpClient.get(`${API_V1}/players/me`)
  }

  updateMyProfile(payload) {
    return httpClient.put(`${API_V1}/players/me`, payload)
  }

  listMyPenas({ page = 1, pageSize = 100 } = {}) {
    return httpClient.get(`${API_V1}/penas?page=${page}&page_size=${pageSize}`)
  }

  consumeJoinToken(payload) {
    return httpClient.post(`${API_V1}/penas/link/consume`, payload)
  }

  getMyMembership(penaGuid) {
    return httpClient.get(`${API_V1}/players/me/penas/${penaGuid}`)
  }

  listSeasons(penaGuid, { page = 1, pageSize = 100 } = {}) {
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons?page=${page}&page_size=${pageSize}`)
  }

  getActiveSeason(penaGuid, atDate) {
    const query = atDate ? `?at_date=${encodeURIComponent(atDate)}` : ''
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/active${query}`)
  }

  listSeasonMatches(penaGuid, seasonGuid, { page = 1, pageSize = 100 } = {}) {
    return httpClient.get(
      `${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches?page=${page}&page_size=${pageSize}`
    )
  }

  getMatchDetail(penaGuid, seasonGuid, matchGuid) {
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches/${matchGuid}`)
  }

  listStandings(penaGuid, seasonGuid, { page = 1, pageSize = 20 } = {}) {
    return httpClient.get(
      `${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/standings?page=${page}&page_size=${pageSize}`
    )
  }

  updateMyMembership(penaGuid, payload) {
    return httpClient.patch(`${API_V1}/penas/${penaGuid}/players/me`, payload)
  }

  leavePena(penaGuid) {
    return httpClient.delete(`${API_V1}/penas/${penaGuid}/players/me`)
  }

  getNationalities() {
    return httpClient.get(`${API_V1}/catalogs/nationalities`).then(normalizeNationalities)
  }
}

export const userService = new UserService()
