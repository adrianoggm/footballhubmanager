/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { useI18n } from '../../i18n/useI18n.js'
import { ThemeModeProvider } from '../../theme/ThemeModeProvider.jsx'
import AdminInsightsSection from './AdminInsightsSection.jsx'

function Section({ onRefreshInsights }) {
  const { t } = useI18n()
  return (
    <AdminInsightsSection
      state={{
        selectedSeasonGuid: 's1',
        insightsScope: 'selected_season',
        insightsLoading: false,
        insightsReport: null,
        insightsComparisonReport: null,
        insightsComparison: null,
      }}
      actions={{ onInsightsScopeChange: vi.fn(), onRefreshInsights }}
      helpers={{
        t,
        formatDecimal: (value) => String(value),
        formatSignedDecimal: (value) => String(value),
        formatPercent: (value) => String(value),
      }}
    />
  )
}

describe('AdminInsightsSection', () => {
  it('U-18: a single refresh action that sends the selected date range', () => {
    const onRefreshInsights = vi.fn()
    render(
      <I18nProvider>
        <ThemeModeProvider>
          <Section onRefreshInsights={onRefreshInsights} />
        </ThemeModeProvider>
      </I18nProvider>
    )

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-07-31' } })

    const refreshButtons = screen.getAllByRole('button', { name: 'Refresh insights' })
    expect(refreshButtons).toHaveLength(1)
    fireEvent.click(refreshButtons[0])

    expect(onRefreshInsights).toHaveBeenCalledWith({ dateFrom: '2026-07-01', dateTo: '2026-07-31' })
  })
})
