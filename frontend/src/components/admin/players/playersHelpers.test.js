import { describe, expect, it } from 'vitest'
import {
  SEASON_STATUS,
  filterPlayers,
  isInSeason,
  paginate,
  playerSortKey,
  sortPlayers,
} from './playersHelpers.js'

const P = (over) => ({
  guid: 'g',
  name: 'Marco',
  surname1: 'Asensio',
  surname2: '',
  nickname: 'The Sniper',
  role: 'member',
  position: 'FWD',
  has_account: true,
  ...over,
})

describe('playersHelpers', () => {
  it('derives season membership from the roster guid set', () => {
    const set = new Set(['a', 'b'])
    expect(isInSeason(P({ guid: 'a' }), set)).toBe(true)
    expect(isInSeason(P({ guid: 'z' }), set)).toBe(false)
  })

  it('builds a lowercase sort key from name + surnames', () => {
    expect(playerSortKey(P({ name: 'Luka', surname1: 'Maestro', surname2: '' }))).toBe(
      'luka maestro'
    )
  })

  it('search matches name, surnames and nickname case-insensitively', () => {
    const list = [
      P({ guid: '1', nickname: 'The Sniper' }),
      P({ guid: '2', name: 'Dani', surname1: 'Rock', nickname: 'The Tank' }),
    ]
    expect(
      filterPlayers(
        list,
        { search: 'sniper', roles: [], positions: [], status: SEASON_STATUS.ALL },
        new Set()
      ).map((p) => p.guid)
    ).toEqual(['1'])
    expect(
      filterPlayers(
        list,
        { search: 'rock', roles: [], positions: [], status: SEASON_STATUS.ALL },
        new Set()
      ).map((p) => p.guid)
    ).toEqual(['2'])
  })

  it('filters by role, position and season status', () => {
    const list = [
      P({ guid: '1', role: 'member', position: 'FWD' }),
      P({ guid: '2', role: 'guest', position: 'GK' }),
    ]
    const inSeason = new Set(['1'])
    expect(
      filterPlayers(
        list,
        { search: '', roles: ['guest'], positions: [], status: SEASON_STATUS.ALL },
        inSeason
      ).map((p) => p.guid)
    ).toEqual(['2'])
    expect(
      filterPlayers(
        list,
        { search: '', roles: [], positions: ['FWD'], status: SEASON_STATUS.ALL },
        inSeason
      ).map((p) => p.guid)
    ).toEqual(['1'])
    expect(
      filterPlayers(
        list,
        { search: '', roles: [], positions: [], status: SEASON_STATUS.IN_SEASON },
        inSeason
      ).map((p) => p.guid)
    ).toEqual(['1'])
    expect(
      filterPlayers(
        list,
        { search: '', roles: [], positions: [], status: SEASON_STATUS.OUT_OF_SEASON },
        inSeason
      ).map((p) => p.guid)
    ).toEqual(['2'])
  })

  it('filters by role case-insensitively', () => {
    const list = [P({ guid: '1', role: 'guest' }), P({ guid: '2', role: 'member' })]
    expect(
      filterPlayers(
        list,
        { search: '', roles: ['GUEST'], positions: [], status: SEASON_STATUS.ALL },
        new Set()
      ).map((p) => p.guid)
    ).toEqual(['1'])
  })

  it('sorts by display name asc and desc without mutating input', () => {
    const list = [
      P({ guid: '1', name: 'Zed', surname1: '' }),
      P({ guid: '2', name: 'Ana', surname1: '' }),
    ]
    expect(sortPlayers(list, 'name_asc').map((p) => p.guid)).toEqual(['2', '1'])
    expect(sortPlayers(list, 'name_desc').map((p) => p.guid)).toEqual(['1', '2'])
    expect(list.map((p) => p.guid)).toEqual(['1', '2'])
  })

  it('sorts by season status, tiebreaking by name', () => {
    const list = [
      P({ guid: '1', name: 'Zed', surname1: '' }),
      P({ guid: '2', name: 'Ana', surname1: '' }),
    ]
    const inSeason = new Set(['2'])
    expect(sortPlayers(list, 'status_active', inSeason).map((p) => p.guid)).toEqual(['2', '1'])
    expect(sortPlayers(list, 'status_inactive', inSeason).map((p) => p.guid)).toEqual(['1', '2'])
  })

  it('paginates and clamps the page into range', () => {
    const items = Array.from({ length: 23 }, (_, i) => i)
    const r = paginate(items, 3, 10)
    expect(r.total).toBe(23)
    expect(r.pageCount).toBe(3)
    expect(r.pageItems).toEqual([20, 21, 22])
    expect(r.shown).toBe(3)
    expect(paginate(items, 99, 10).pageItems).toEqual([20, 21, 22])
    expect(paginate([], 1, 10)).toEqual({ pageItems: [], total: 0, pageCount: 1, shown: 0 })
  })
})
