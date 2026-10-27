import { describe, expect, it } from 'vitest'
import {
  SEASON_STATUS,
  buildPlayerLabeler,
  defaultRoleLabel,
  filterPlayers,
  findDuplicatePlayers,
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

describe('defaultRoleLabel (PL-04)', () => {
  it('prefers guest for players without account and member for account holders', () => {
    const roles = ['president', 'coordinator', 'member', 'guest']
    expect(defaultRoleLabel(roles, { hasAccount: false })).toBe('guest')
    expect(defaultRoleLabel(roles, { hasAccount: true })).toBe('member')
  })

  it('never falls back to the first label (president) once guest is removed', () => {
    expect(defaultRoleLabel(['president', 'coordinator', 'member'], { hasAccount: false })).toBe(
      'member'
    )
    expect(defaultRoleLabel(['president', 'socio'], { hasAccount: false })).toBe('socio')
    expect(defaultRoleLabel([], { hasAccount: false })).toBe('')
  })
})

describe('findDuplicatePlayers (PL-06)', () => {
  const players = [
    P({ guid: 'a', name: 'Juan', surname1: 'García', nickname: '' }),
    P({ guid: 'b', name: 'Juan', surname1: 'López', nickname: '' }),
    P({ guid: 'c', name: 'Luis', surname1: 'García', nickname: 'Lucho' }),
  ]

  it('matches name + first surname case-insensitively', () => {
    const dups = findDuplicatePlayers(players, { name: ' juan ', surname1: 'GARCÍA' })
    expect(dups.map((p) => p.guid)).toEqual(['a'])
  })

  it('treats a different nickname as a different player', () => {
    expect(
      findDuplicatePlayers(players, { name: 'Luis', surname1: 'García', nickname: 'Otro' })
    ).toEqual([])
    expect(
      findDuplicatePlayers(players, { name: 'Luis', surname1: 'García', nickname: 'lucho' })
    ).toHaveLength(1)
  })

  it('does not warn until name and surname are filled in', () => {
    expect(findDuplicatePlayers(players, { name: 'Juan', surname1: '' })).toEqual([])
  })
})

describe('buildPlayerLabeler (PL-06)', () => {
  const format = (p) => `${p.name} ${p.surname1}`

  it('keeps unique names untouched', () => {
    const players = [P({ guid: 'a', name: 'Ana', surname1: 'Ruiz' })]
    expect(buildPlayerLabeler(players, format)(players[0])).toBe('Ana Ruiz')
  })

  it('adds a distinguishing detail when display names collide', () => {
    const players = [
      P({ guid: 'aaaa1111-x', name: 'Ana', surname1: 'Ruiz', surname2: '', nationality: 'Spain' }),
      P({ guid: 'bbbb2222-y', name: 'Ana', surname1: 'Ruiz', surname2: 'Gil', nationality: '' }),
    ]
    const label = buildPlayerLabeler(players, format)
    expect(label(players[0])).toBe('Ana Ruiz (Spain · #AAAA11)')
    expect(label(players[1])).toBe('Ana Ruiz (Gil · #BBBB22)')
    expect(label(players[0])).not.toBe(label(players[1]))
  })
})
