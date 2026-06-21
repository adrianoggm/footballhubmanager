/** @vitest-environment happy-dom */
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { adminServiceMock } = vi.hoisted(() => ({
  adminServiceMock: {
    getMatchDetail: vi.fn(),
    updateMatchLineups: vi.fn(),
    listSeasonMatches: vi.fn(),
  },
}))

vi.mock('../services/adminService.js', () => ({ adminService: adminServiceMock }))

import { useMatchTracking } from './useMatchTracking.js'

const matchDetail = {
  guid: 'm1',
  tracking_status: 'not_started',
  home_team: { players: [{ player_guid: 'h1' }, { player_guid: 'h2' }] },
  away_team: { players: [{ player_guid: 'a1' }] },
}

// Minimal runAction shim: runs the action and swallows nothing, mirroring the
// dashboard contract (await action(), surface errors via setError upstream).
const makeOptions = (overrides = {}) => {
  const setError = vi.fn()
  return {
    setError,
    options: {
      selectedPenaGuid: 'p1',
      selectedSeasonGuid: 's1',
      seasonRoster: [],
      seasonList: [{ guid: 's1' }],
      initializing: true, // keep the auto-load effect inert; we drive flows manually
      runAction: async (action) => {
        await action()
      },
      setError,
      onUnauthorized: vi.fn(),
      showToast: vi.fn(),
      t: (key) => key,
      refreshStandingsAndRoster: vi.fn(async () => {}),
      ...overrides,
    },
  }
}

describe('useMatchTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with an empty list and no selection', () => {
    const { options } = makeOptions()
    const { result } = renderHook(() => useMatchTracking(options))
    expect(result.current.visibleSeasonMatches).toEqual([])
    expect(result.current.selectedMatchGuid).toBe('')
    expect(result.current.selectedMatchDetail).toBeNull()
    expect(result.current.overviewMatchesSummary).toEqual({ total: 0, closed: 0, open: 0 })
  })

  it('handleOpenMatchStats loads detail and seeds the drafts', async () => {
    adminServiceMock.getMatchDetail.mockResolvedValue(matchDetail)
    const { options } = makeOptions()
    const { result } = renderHook(() => useMatchTracking(options))

    await act(async () => {
      await result.current.handleOpenMatchStats('m1')
    })

    expect(adminServiceMock.getMatchDetail).toHaveBeenCalledWith('p1', 's1', 'm1')
    expect(result.current.selectedMatchGuid).toBe('m1')
    expect(result.current.matchLineupsDraft).toEqual({
      home_player_guids: ['h1', 'h2'],
      away_player_guids: ['a1'],
    })
    expect(result.current.matchEditorLineupPlayers).toHaveLength(3)
  })

  it('resetSelection clears the loaded selection', async () => {
    adminServiceMock.getMatchDetail.mockResolvedValue(matchDetail)
    const { options } = makeOptions()
    const { result } = renderHook(() => useMatchTracking(options))

    await act(async () => {
      await result.current.handleOpenMatchStats('m1')
    })
    act(() => {
      result.current.resetSelection()
    })

    expect(result.current.selectedMatchGuid).toBe('')
    expect(result.current.selectedMatchDetail).toBeNull()
    expect(result.current.matchLineupsDraft).toBeNull()
  })

  it('handleSaveMatchLineups rejects an empty lineup without calling the API', async () => {
    adminServiceMock.getMatchDetail.mockResolvedValue({
      ...matchDetail,
      home_team: { players: [] },
      away_team: { players: [] },
    })
    const { options, setError } = makeOptions()
    const { result } = renderHook(() => useMatchTracking(options))

    await act(async () => {
      await result.current.handleOpenMatchStats('m1')
    })
    await act(async () => {
      await result.current.handleSaveMatchLineups()
    })

    expect(adminServiceMock.updateMatchLineups).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalledWith(expect.any(Error))
  })

  it('handleSaveMatchLineups rejects overlapping rosters', async () => {
    adminServiceMock.getMatchDetail.mockResolvedValue(matchDetail)
    const { options, setError } = makeOptions()
    const { result } = renderHook(() => useMatchTracking(options))

    await act(async () => {
      await result.current.handleOpenMatchStats('m1')
    })
    // Force the same guid on both sides.
    act(() => {
      result.current.onMatchLineupsDraftChange({
        homePlayerGuids: ['shared'],
        awayPlayerGuids: ['shared'],
      })
    })
    await act(async () => {
      await result.current.handleSaveMatchLineups()
    })

    expect(adminServiceMock.updateMatchLineups).not.toHaveBeenCalled()
    expect(setError).toHaveBeenCalled()
  })

  it('handleSaveMatchLineups posts a valid lineup then refreshes siblings', async () => {
    adminServiceMock.getMatchDetail.mockResolvedValue(matchDetail)
    adminServiceMock.updateMatchLineups.mockResolvedValue(matchDetail)
    adminServiceMock.listSeasonMatches.mockResolvedValue({ items: [] })
    const refreshStandingsAndRoster = vi.fn(async () => {})
    const { options } = makeOptions({ refreshStandingsAndRoster })
    const { result } = renderHook(() => useMatchTracking(options))

    await act(async () => {
      await result.current.handleOpenMatchStats('m1')
    })
    await act(async () => {
      await result.current.handleSaveMatchLineups()
    })

    await waitFor(() =>
      expect(adminServiceMock.updateMatchLineups).toHaveBeenCalledWith('p1', 's1', 'm1', {
        home_team: { player_guids: ['h1', 'h2'] },
        away_team: { player_guids: ['a1'] },
      })
    )
    expect(refreshStandingsAndRoster).toHaveBeenCalledWith('p1', 's1')
  })
})
