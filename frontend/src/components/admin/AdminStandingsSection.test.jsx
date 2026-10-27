/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '../../i18n/context.js'
import { createTestI18nValue } from '../../i18n/testUtils.js'
import { createAppTheme } from '../../theme.js'
import AdminStandingsSection from './AdminStandingsSection.jsx'

const i18n = createTestI18nValue('en')

const player = (overrides) => ({
  player_guid: 'p1',
  name: 'Gema',
  surname1: 'X',
  nickname: null,
  role: null,
  position: null,
  played: 2,
  wins: 1,
  draws: 1,
  losses: 0,
  goals: 3,
  assists: 1,
  saves: 4,
  average_rating: 9,
  points: 5,
  ...overrides,
})

const renderSection = (standings) =>
  render(
    <ThemeProvider theme={createAppTheme()}>
      <I18nContext.Provider value={i18n}>
        <AdminStandingsSection
          state={{
            selectedSeasonGuid: 'season-1',
            selectedSeasonLabel: '2026/27',
            loading: false,
            standings,
            standingsFilters: { role: [], position: [] },
            penaLabels: { role_labels: [], position_labels: [] },
            insightsScope: 'selected_season',
            insightsLoading: false,
            insightsReport: null,
            insightsComparisonReport: null,
            insightsComparison: null,
          }}
          actions={{
            onRefreshStandings: vi.fn(),
            onStandingsFilterField: () => vi.fn(),
            onInsightsScopeChange: vi.fn(),
            onRefreshInsights: vi.fn(),
          }}
          helpers={{
            t: i18n.t,
            formatDecimal: (value, digits = 2) => Number(value || 0).toFixed(digits),
            formatSignedDecimal: String,
            formatPercent: String,
          }}
        />
      </I18nContext.Provider>
    </ThemeProvider>
  )

// MT-13: the API returns saves and average_rating but the table hid them.
describe('AdminStandingsSection table', () => {
  it('shows saves and average rating columns', () => {
    renderSection([
      player(),
      player({ player_guid: 'p2', name: 'Nora', saves: 0, average_rating: 0 }),
    ])

    const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent)
    expect(headers).toContain(i18n.t('dashboard.admin.table.saves'))
    expect(headers).toContain(i18n.t('dashboard.admin.table.rating'))

    const gemaRow = screen.getByText('Gema X').closest('tr')
    expect(within(gemaRow).getByText('4')).toBeInTheDocument()
    expect(within(gemaRow).getByText('9.0')).toBeInTheDocument()

    // A player without rated matches shows a dash instead of a misleading 0.
    const noraRow = screen.getByText('Nora X').closest('tr')
    // role, position and rating cells
    expect(within(noraRow).getAllByText('-')).toHaveLength(3)
  })
})
