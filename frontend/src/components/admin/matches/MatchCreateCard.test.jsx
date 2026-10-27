/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '../../../i18n/context.js'
import { createTestI18nValue } from '../../../i18n/testUtils.js'
import MatchCreateCard from './MatchCreateCard.jsx'

const i18n = createTestI18nValue('en')

const baseState = {
  selectedSeasonGuid: 'season-1',
  selectedSeason: { start_date: '2026-09-01', end_date: '2027-06-30' },
  seasonRosterLoading: false,
  seasonRoster: [],
  createMatchLineupPlayers: [],
  matchFormHomeGuids: [],
  matchFormAwayGuids: [],
  matchForm: {
    match_date: '2026-10-27',
    home_team_name: '',
    away_team_name: '',
  },
  loading: false,
  lastCreatedMatch: null,
}

const renderCard = (state = {}, inlineError = '') =>
  render(
    <I18nContext.Provider value={i18n}>
      <MatchCreateCard
        state={{ ...baseState, ...state }}
        actions={{
          onMatchField: () => () => {},
          onMatchFormLineupsChange: vi.fn(),
          handleCreateDetailedMatch: vi.fn(),
        }}
        helpers={{ t: i18n.t, formatDate: (iso) => `fmt(${iso})` }}
        inlineError={inlineError}
      />
    </I18nContext.Provider>
  )

describe('MatchCreateCard', () => {
  // MT-11: the success notice showed the internal match GUID.
  it('announces the created match by teams and date, not by GUID', () => {
    renderCard({
      lastCreatedMatch: {
        guid: '90d9408b-1111-2222-3333-444455556666',
        match_date: '2026-10-27',
        home_team: { team_name: 'Reds' },
        away_team: { team_name: 'Blues' },
      },
    })
    const notice = screen.getByText(/created/i)
    expect(notice).toHaveTextContent('Reds')
    expect(notice).toHaveTextContent('Blues')
    expect(notice).toHaveTextContent('fmt(2026-10-27)')
    expect(notice).not.toHaveTextContent('90d9408b')
  })

  // MT-06: create errors used to render only in the page-level alert, off-screen.
  it('renders the create error inline inside the card', () => {
    renderCard({}, 'Select a match date')
    const card = screen
      .getByRole('button', { name: i18n.t('dashboard.admin.matches.createDetailedMatch') })
      .closest('.MuiCard-root')
    expect(within(card).getByRole('alert')).toHaveTextContent('Select a match date')
  })

  it('renders no inline alert without an error', () => {
    renderCard()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
