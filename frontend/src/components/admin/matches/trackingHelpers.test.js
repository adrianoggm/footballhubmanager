import { describe, expect, it } from 'vitest'

import {
  buildTrackedTeamScore,
  clampTrackedValue,
  resolveDisplayedElapsed,
} from './trackingHelpers.js'

describe('clampTrackedValue', () => {
  it('floors at 0 and coerces to number', () => {
    expect(clampTrackedValue(5)).toBe(5)
    expect(clampTrackedValue(-3)).toBe(0)
    expect(clampTrackedValue('4')).toBe(4)
    expect(clampTrackedValue(null)).toBe(0)
    expect(clampTrackedValue(undefined)).toBe(0)
  })
})

describe('resolveDisplayedElapsed', () => {
  it('returns 0 when there is no match detail', () => {
    expect(resolveDisplayedElapsed(null, 1000)).toBe(0)
  })

  it('uses stored elapsed when the match is not started', () => {
    const detail = { tracking_status: 'not_started', elapsed_seconds: 0 }
    expect(resolveDisplayedElapsed(detail, 999999)).toBe(0)
  })

  it('uses stored elapsed for a finished match even with a start epoch', () => {
    const detail = {
      tracking_status: 'finished',
      started_at_epoch: 1000,
      elapsed_seconds: 600,
    }
    expect(resolveDisplayedElapsed(detail, 999999)).toBe(600)
  })

  it('computes live elapsed from epochs while running', () => {
    const detail = {
      tracking_status: 'live',
      started_at_epoch: 1000,
      total_paused_seconds: 0,
      elapsed_seconds: 0,
    }
    expect(resolveDisplayedElapsed(detail, 1100)).toBe(100)
  })

  it('excludes completed pause time', () => {
    const detail = {
      tracking_status: 'live',
      started_at_epoch: 1000,
      total_paused_seconds: 30,
      elapsed_seconds: 0,
    }
    expect(resolveDisplayedElapsed(detail, 1100)).toBe(70)
  })

  it('freezes while paused via paused_at_epoch by excluding the in-progress pause', () => {
    const detail = {
      tracking_status: 'paused',
      started_at_epoch: 1000,
      total_paused_seconds: 0,
      paused_at_epoch: 1100,
      elapsed_seconds: 0,
    }
    expect(resolveDisplayedElapsed(detail, 1200)).toBe(100)
    expect(resolveDisplayedElapsed(detail, 5000)).toBe(100)
  })

  it('never goes below the stored elapsed after resume', () => {
    const detail = {
      tracking_status: 'live',
      started_at_epoch: 1000,
      total_paused_seconds: 0,
      elapsed_seconds: 150,
    }
    expect(resolveDisplayedElapsed(detail, 1100)).toBe(150)
  })
})

describe('buildTrackedTeamScore', () => {
  it('returns null for missing, closed, or event-less matches', () => {
    expect(buildTrackedTeamScore(null)).toBeNull()
    expect(buildTrackedTeamScore({ status: 'closed', events: [{ event_type: 'goal' }] })).toBeNull()
    expect(buildTrackedTeamScore({ events: [] })).toBeNull()
  })

  it('counts goals per side and ignores non-goal or invalid sides', () => {
    const detail = {
      status: 'open',
      events: [
        { event_type: 'goal', team_side: 'home', value_delta: 1 },
        { event_type: 'goal', team_side: 'away', value_delta: 1 },
        { event_type: 'goal', team_side: 'home', value_delta: 1 },
        { event_type: 'save', team_side: 'home', value_delta: 1 },
        { event_type: 'goal', team_side: 'neutral', value_delta: 1 },
      ],
    }
    expect(buildTrackedTeamScore(detail)).toEqual({ home: 2, away: 1 })
  })

  it('clamps negative net goals to 0', () => {
    const detail = {
      status: 'open',
      events: [{ event_type: 'goal', team_side: 'home', value_delta: -1 }],
    }
    expect(buildTrackedTeamScore(detail)).toEqual({ home: 0, away: 0 })
  })
})
