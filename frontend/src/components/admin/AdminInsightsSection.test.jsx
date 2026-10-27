/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '../../i18n/context.js'
import { createTestI18nValue } from '../../i18n/testUtils.js'
import { createAppTheme } from '../../theme.js'
import AdminInsightsSection from './AdminInsightsSection.jsx'

const i18n = createTestI18nValue('en')

const renderSection = () =>
  render(
    <ThemeProvider theme={createAppTheme()}>
      <I18nContext.Provider value={i18n}>
        <AdminInsightsSection
          state={{
            selectedSeasonGuid: 'season-1',
            insightsScope: 'selected_season',
            insightsLoading: false,
            insightsReport: null,
            insightsComparisonReport: null,
            insightsComparison: null,
          }}
          actions={{ onInsightsScopeChange: vi.fn(), onRefreshInsights: vi.fn() }}
          helpers={{
            t: i18n.t,
            formatDecimal: String,
            formatSignedDecimal: String,
            formatPercent: String,
          }}
        />
      </I18nContext.Provider>
    </ThemeProvider>
  )

describe('AdminInsightsSection date range (MT-15)', () => {
  it('uses the themed DateField instead of native date inputs', () => {
    const { container } = renderSection()
    expect(container.querySelector('input[type="date"]')).toBeNull()
    for (const key of ['insightsDateFrom', 'insightsDateTo']) {
      const input = screen.getByLabelText(i18n.t(`dashboard.admin.standings.${key}`))
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('placeholder', 'DD/MM/YYYY')
    }
  })
})
