import { describe, expect, it } from 'vitest'

import {
  buildMatchLineupsDraft,
  buildMatchStatsDraft,
  defaultMatchEventDraft,
  parseMatchEventElapsedDraft,
  parseStatsPayload,
  resetMatchFormAfterCreate,
  validateMatchDate,
} from './matchDrafts.js'

describe('defaultMatchEventDraft', () => {
  it('defaults to a +1 home goal with empty time fields', () => {
    expect(defaultMatchEventDraft()).toEqual({
      event_type: 'goal',
      team_side: 'home',
      player_guid: '',
      related_player_guid: '',
      note: '',
      minute: '',
      second: '',
      value_delta: '1',
    })
  })
})

describe('buildMatchLineupsDraft', () => {
  it('maps each team to its player guids', () => {
    const detail = {
      home_team: { players: [{ player_guid: 'a' }, { player_guid: 'b' }] },
      away_team: { players: [{ player_guid: 'c' }] },
    }
    expect(buildMatchLineupsDraft(detail)).toEqual({
      home_player_guids: ['a', 'b'],
      away_player_guids: ['c'],
    })
  })

  it('tolerates missing teams/players', () => {
    expect(buildMatchLineupsDraft(null)).toEqual({
      home_player_guids: [],
      away_player_guids: [],
    })
  })
})

describe('buildMatchStatsDraft', () => {
  it('stringifies per-player stats with 0 fallbacks', () => {
    const detail = {
      home_team: { players: [{ player_guid: 'a', goals: 2, assists: 1 }] },
      away_team: { players: [] },
    }
    const draft = buildMatchStatsDraft(detail)
    expect(draft.home_team.players[0]).toEqual({
      player_guid: 'a',
      goals: '2',
      assists: '1',
      saves: '0',
      rating: '0',
    })
    expect(draft.away_team.players).toEqual([])
  })
})

describe('parseMatchEventElapsedDraft', () => {
  it('treats empty minute and second as no value', () => {
    expect(parseMatchEventElapsedDraft({ minute: '', second: '' })).toEqual({
      isValid: true,
      hasValue: false,
      value: null,
    })
  })

  it('converts minute+second to total seconds', () => {
    expect(parseMatchEventElapsedDraft({ minute: '2', second: '30' })).toEqual({
      isValid: true,
      hasValue: true,
      value: 150,
    })
  })

  it('accepts a lone minute (0 is a legitimate value)', () => {
    expect(parseMatchEventElapsedDraft({ minute: '0', second: '' })).toEqual({
      isValid: true,
      hasValue: true,
      value: 0,
    })
  })

  it('rejects out-of-range or non-integer input', () => {
    expect(parseMatchEventElapsedDraft({ minute: '1', second: '60' }).isValid).toBe(false)
    expect(parseMatchEventElapsedDraft({ minute: '-1', second: '' }).isValid).toBe(false)
    expect(parseMatchEventElapsedDraft({ minute: '1.5', second: '' }).isValid).toBe(false)
  })
})

// MT-02: a match without a date used to be sent as match_date:"" (422).
describe('validateMatchDate', () => {
  const season = { start_date: '2026-09-01', end_date: '2027-06-30' }

  it('requires a date', () => {
    expect(validateMatchDate('', season)).toBe('dashboard.admin.errors.matchDateRequired')
    expect(validateMatchDate(null, season)).toBe('dashboard.admin.errors.matchDateRequired')
    expect(validateMatchDate('   ', season)).toBe('dashboard.admin.errors.matchDateRequired')
  })

  it('rejects dates outside the season', () => {
    expect(validateMatchDate('2026-08-31', season)).toBe(
      'dashboard.admin.errors.matchDateOutsideSeason'
    )
    expect(validateMatchDate('2027-07-01', season)).toBe(
      'dashboard.admin.errors.matchDateOutsideSeason'
    )
  })

  it('accepts dates within the season, boundaries included', () => {
    expect(validateMatchDate('2026-09-01', season)).toBeNull()
    expect(validateMatchDate('2026-10-27', season)).toBeNull()
    expect(validateMatchDate('2027-06-30', season)).toBeNull()
  })

  it('only checks presence when the season has no range', () => {
    expect(validateMatchDate('2030-01-01', null)).toBeNull()
  })
})

// MT-11: the create form must be cleared after a match is created so a second
// click does not create a duplicate; the date is kept for the next match.
describe('resetMatchFormAfterCreate', () => {
  it('clears teams and lineups but keeps the date', () => {
    expect(
      resetMatchFormAfterCreate({
        match_date: '2026-10-27',
        home_team_name: 'Reds',
        away_team_name: 'Blues',
        home_player_guids: ['a'],
        away_player_guids: ['b'],
      })
    ).toEqual({
      match_date: '2026-10-27',
      home_team_name: '',
      away_team_name: '',
      home_player_guids: [],
      away_player_guids: [],
    })
  })
})

// MT-09: ratings are on a 0-10 scale.
describe('parseStatsPayload', () => {
  const row = (rating) => ({ player_guid: 'ana', goals: '1', assists: '0', saves: '2', rating })

  it('parses a valid row into numbers', () => {
    expect(parseStatsPayload(row('7.5'))).toEqual({
      player_guid: 'ana',
      goals: 1,
      assists: 0,
      saves: 2,
      rating: 7.5,
    })
  })

  it('accepts the 0 and 10 boundaries', () => {
    expect(parseStatsPayload(row('0'))).not.toBeNull()
    expect(parseStatsPayload(row('10'))).not.toBeNull()
  })

  it('rejects ratings above 10 or below 0', () => {
    expect(parseStatsPayload(row('10.5'))).toBeNull()
    expect(parseStatsPayload(row('-1'))).toBeNull()
  })

  it('rejects negative or fractional counters', () => {
    expect(parseStatsPayload({ ...row('5'), goals: '-1' })).toBeNull()
    expect(parseStatsPayload({ ...row('5'), saves: '1.5' })).toBeNull()
  })
})
