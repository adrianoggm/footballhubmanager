/**
 * Loads a pena's seasons and its active season (admin and user dashboards share it).
 *
 * The active season is only requested once we know the pena has seasons: a new
 * pena has none, and asking would just produce a 404 ("no active season") in the
 * browser console on every dashboard load. A 404 still means "no active season"
 * (e.g. between two seasons); other errors propagate.
 *
 * `service` is adminService or userService (both expose listSeasons/getActiveSeason).
 */
export async function loadSeasonsWithActive(service, penaGuid) {
  const seasonsPage = await service.listSeasons(penaGuid, { pageSize: 100 })
  if (!seasonsPage?.items?.length) {
    return { seasonsPage, activeSeason: null }
  }
  const activeSeason = await service.getActiveSeason(penaGuid).catch((requestError) => {
    if (requestError?.status === 404) {
      return null
    }
    throw requestError
  })
  return { seasonsPage, activeSeason }
}
