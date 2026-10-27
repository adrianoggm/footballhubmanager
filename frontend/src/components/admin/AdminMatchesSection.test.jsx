/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '../../i18n/context.js'
import { createTestI18nValue } from '../../i18n/testUtils.js'
import AdminMatchesSection from './AdminMatchesSection.jsx'

const i18n = createTestI18nValue('en')

const baseState = {
  selectedSeasonGuid: 'season-1',
  selectedSeason: { start_date: '2026-09-01', end_date: '2027-06-30' },
  seasonRosterLoading: false,
  seasonRoster: [],
  createMatchLineupPlayers: [],
  matchFormHomeGuids: [],
  matchFormAwayGuids: [],
  matchForm: { match_date: '', home_team_name: '', away_team_name: '' },
  loading: false,
  lastCreatedMatch: null,
  seasonMatchesLoading: false,
  visibleSeasonMatches: [],
  selectedMatchGuid: '',
  deletingMatchGuid: '',
  matchStatsLoading: false,
  selectedMatchDetail: null,
  matchLineupsDraft: null,
  matchStatsDraft: null,
  actionError: '',
}

const renderSection = (actions, state = {}) => {
  const ui = (nextState) => (
    <I18nContext.Provider value={i18n}>
      <AdminMatchesSection
        state={{ ...baseState, ...nextState }}
        actions={{
          onMatchField: () => () => {},
          onMatchFormLineupsChange: vi.fn(),
          handleOpenMatchStats: vi.fn(),
          handleRequestDeleteSeasonMatch: vi.fn(),
          ...actions,
        }}
        helpers={{
          t: i18n.t,
          formatDate: (iso) => iso,
          formatElapsedDuration: (seconds) => String(seconds),
          formatPlayerDisplayName: (player) => player.player_guid,
        }}
      />
    </I18nContext.Provider>
  )
  const view = render(ui(state))
  return { ...view, rerenderWith: (nextState) => view.rerender(ui(nextState)) }
}

const createButtonName = i18n.t('dashboard.admin.matches.createDetailedMatch')

describe('AdminMatchesSection inline action errors (MT-06)', () => {
  it('shows a create-match error inside the create card after creating', () => {
    const handleCreateDetailedMatch = vi.fn()
    const { rerenderWith } = renderSection({ handleCreateDetailedMatch })

    fireEvent.click(screen.getByRole('button', { name: createButtonName }))
    expect(handleCreateDetailedMatch).toHaveBeenCalledTimes(1)

    rerenderWith({ actionError: 'Select a match date' })
    const card = screen.getByRole('button', { name: createButtonName }).closest('.MuiCard-root')
    expect(within(card).getByRole('alert')).toHaveTextContent('Select a match date')
  })

  it('does not attach an error to the create card when it did not trigger it', () => {
    renderSection({ handleCreateDetailedMatch: vi.fn() }, { actionError: 'Something else' })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
