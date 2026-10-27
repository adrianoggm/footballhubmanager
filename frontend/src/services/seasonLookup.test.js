import { describe, expect, it, vi } from 'vitest'

import { loadSeasonsWithActive } from './seasonLookup.js'

const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { status })
const season = { guid: 's1', start_date: '2026-06-01', end_date: '2026-09-01' }

const makeService = ({ items = [], active = season } = {}) => ({
  listSeasons: vi.fn(async () => ({ items, total: items.length })),
  getActiveSeason: vi.fn(async () => {
    if (active instanceof Error) {
      throw active
    }
    return active
  }),
})

describe('loadSeasonsWithActive (F12)', () => {
  it('does not ask for the active season when the pena has no seasons', async () => {
    const service = makeService({ items: [] })

    const result = await loadSeasonsWithActive(service, 'p1')

    expect(service.getActiveSeason).not.toHaveBeenCalled()
    expect(result).toEqual({ seasonsPage: { items: [], total: 0 }, activeSeason: null })
  })

  it('returns the active season when there are seasons', async () => {
    const service = makeService({ items: [season] })

    const result = await loadSeasonsWithActive(service, 'p1')

    expect(service.listSeasons).toHaveBeenCalledWith('p1', { pageSize: 100 })
    expect(service.getActiveSeason).toHaveBeenCalledWith('p1')
    expect(result.activeSeason).toEqual(season)
  })

  it('maps "no active season" (404) to null', async () => {
    const service = makeService({ items: [season], active: httpError(404) })

    await expect(loadSeasonsWithActive(service, 'p1')).resolves.toMatchObject({
      activeSeason: null,
    })
  })

  it('propagates other errors', async () => {
    const error = httpError(500)
    const service = makeService({ items: [season], active: error })

    await expect(loadSeasonsWithActive(service, 'p1')).rejects.toBe(error)
  })
})
