/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTestT } from '../../../i18n/testUtils.js'
import MatchStatsTab from './MatchStatsTab.jsx'

const t = createTestT('en')

const team = (name, guid) => ({
  team_name: name,
  players: [{ player_guid: guid }],
})

const baseProps = {
  selectedMatchDetail: {
    status: 'open',
    tracking_status: 'not_started',
    home_team: team('Reds', 'ana'),
    away_team: team('Blues', 'bea'),
  },
  officiallyClosed: false,
  trackingFinished: false,
  officialScoreLabel: 'score',
  matchStatsDraft: { home_team: { players: [] }, away_team: { players: [] } },
  onMatchStatsDraftField: () => vi.fn(),
  formatPlayerDisplayName: (player) => (player.player_guid === 'ana' ? 'Ana' : 'Bea'),
  handleSaveMatchStats: vi.fn(),
  loading: false,
  matchStatsLoading: false,
  t,
}

describe('MatchStatsTab', () => {
  // MT-06: save errors must be visible next to the save action.
  it('renders the save error inline in the stats tab', () => {
    render(<MatchStatsTab {...baseProps} inlineError="Rating must be between 0 and 10" />)
    const alert = screen.getByText('Rating must be between 0 and 10').closest('[role="alert"]')
    expect(alert).toHaveClass('MuiAlert-standardError')
  })

  // MT-15: number inputs had no accessible name.
  it('labels every stat input with the metric and the player', () => {
    render(<MatchStatsTab {...baseProps} />)
    for (const metric of ['Goals', 'Assists', 'Saves', 'Rating']) {
      expect(screen.getByRole('spinbutton', { name: `${metric} - Ana` })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: `${metric} - Bea` })).toBeInTheDocument()
    }
  })
})
