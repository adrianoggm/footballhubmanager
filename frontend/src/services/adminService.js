import { httpClient } from './httpClient.js'

const API_V1 = '/api/v1'

const toQueryString = (params) => {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    query.set(key, String(value))
  })
  const queryString = query.toString()
  return queryString ? `?${queryString}` : ''
}

export class AdminService {
  getPenas({ page = 1, pageSize = 50, search = '' } = {}) {
    const query = toQueryString({ page, page_size: pageSize, search })
    return httpClient.get(`${API_V1}/penas${query}`)
  }

  listSeasons(penaGuid, { page = 1, pageSize = 100 } = {}) {
    const query = toQueryString({ page, page_size: pageSize })
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons${query}`)
  }

  getActiveSeason(penaGuid, atDate) {
    const query = toQueryString({ at_date: atDate })
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/active${query}`)
  }

  createSeason(penaGuid, payload) {
    return httpClient.post(`${API_V1}/penas/${penaGuid}/seasons`, payload)
  }

  updateSeason(penaGuid, seasonGuid, payload) {
    return httpClient.patch(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}`, payload)
  }

  listPenaPlayers(penaGuid, { page = 1, pageSize = 100, search = '' } = {}) {
    const query = toQueryString({ page, page_size: pageSize, search })
    return httpClient.get(`${API_V1}/penas/${penaGuid}/players${query}`)
  }

  listSeasonPlayers(
    penaGuid,
    seasonGuid,
    {
      page = 1,
      pageSize = 100,
      search = '',
      orderBy = 'quality_level',
      orderDir = 'desc'
    } = {}
  ) {
    const query = toQueryString({
      page,
      page_size: pageSize,
      search,
      order_by: orderBy,
      order_dir: orderDir
    })
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/players${query}`)
  }

  listStandings(penaGuid, seasonGuid, { page = 1, pageSize = 20 } = {}) {
    const query = toQueryString({ page, page_size: pageSize })
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/standings${query}`)
  }

  listSeasonMatches(penaGuid, seasonGuid, { page = 1, pageSize = 50 } = {}) {
    const query = toQueryString({ page, page_size: pageSize })
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches${query}`)
  }

  updateMatchResult(penaGuid, seasonGuid, matchGuid, payload) {
    return httpClient.patch(
      `${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches/${matchGuid}/result`,
      payload
    )
  }

  getMatchDetail(penaGuid, seasonGuid, matchGuid) {
    return httpClient.get(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches/${matchGuid}`)
  }

  updateMatchStats(penaGuid, seasonGuid, matchGuid, payload) {
    return httpClient.patch(
      `${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches/${matchGuid}/stats`,
      payload
    )
  }

  createDetailedMatch(penaGuid, seasonGuid, payload) {
    return httpClient.post(
      `${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/matches/detailed`,
      payload
    )
  }

  createLinkToken(penaGuid) {
    return httpClient.post(`${API_V1}/penas/${penaGuid}/link-tokens`, {})
  }

  createGuestPlayer(penaGuid, payload) {
    return httpClient.post(`${API_V1}/penas/${penaGuid}/players`, payload)
  }

  registerSeasonPlayer(penaGuid, seasonGuid, playerGuid) {
    return httpClient.post(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/players`, {
      player_guid: playerGuid
    })
  }

  registerSeasonPlayersBulk(penaGuid, seasonGuid, playerGuids) {
    return httpClient.post(`${API_V1}/penas/${penaGuid}/seasons/${seasonGuid}/players/bulk`, {
      player_guids: playerGuids
    })
  }

  getNationalities() {
    return httpClient.get(`${API_V1}/catalogs/nationalities`)
  }
}

export const adminService = new AdminService()
