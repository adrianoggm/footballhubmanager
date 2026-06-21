/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MatchTrackingTab from './MatchTrackingTab.jsx'

const noop = () => {}

const detail = {
  tracking_status: 'live',
  status: 'open',
  home_team: { team_name: 'Leones', score: 2, players: [] },
  away_team: { team_name: 'Halcones', score: 1, players: [] },
  lineup_change_count: 0,
  events: [],
}

// Minimal valid props for a smoke test of the threaded tab contract.
const baseProps = {
  selectedMatchDetail: detail,
  selectedTrackedScore: { home: 2, away: 1 },
  selectedMatchEvents: [],
  trackingIsLive: true,
  trackingIsPaused: false,
  officiallyClosed: false,
  timelineLocked: false,
  hasLineupAudit: false,
  clockColorKey: 'success',
  displayedElapsed: 65,
  formatElapsedDuration: (s) => `clock-${s}`,
  handleStartMatch: noop,
  handleResumeMatch: noop,
  handlePauseMatch: noop,
  handleStopMatch: noop,
  loading: false,
  matchStatsLoading: false,
  rotationAlarmActive: false,
  rotationAlarmCycle: 0,
  dismissRotationAlarm: noop,
  rotationMinutesInput: '10',
  setRotationMinutesInput: noop,
  handleApplyRotation: noop,
  rotationDirty: false,
  goalkeeperRotationEnabled: false,
  secondsToNextRotation: null,
  quickTrackingEnabled: true,
  eventCountsByPlayer: new Map(),
  handleQuickAdjust: noop,
  formatPlayerDisplayName: (p) => p.player_guid,
  showManualEvent: false,
  setShowManualEvent: noop,
  matchEventDraft: {},
  onMatchEventDraftField: () => () => {},
  handleCreateMatchEvent: noop,
  primaryEventPlayers: [],
  relatedEventPlayers: [],
  t: (key) => key,
}

describe('MatchTrackingTab', () => {
  it('renders both team names (scoreboard + team panel)', () => {
    render(<MatchTrackingTab {...baseProps} />)
    // Each name appears in the scoreboard and again in its quick-tracking panel.
    expect(screen.getAllByText('Leones').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Halcones').length).toBeGreaterThan(0)
  })

  it('shows the live clock value via formatElapsedDuration', () => {
    render(<MatchTrackingTab {...baseProps} />)
    expect(screen.getByText('clock-65')).toBeInTheDocument()
  })

  it('renders the transport controls', () => {
    render(<MatchTrackingTab {...baseProps} />)
    expect(screen.getByText('dashboard.admin.matches.startTracking')).toBeInTheDocument()
    expect(screen.getByText('dashboard.admin.matches.stopTracking')).toBeInTheDocument()
  })
})
