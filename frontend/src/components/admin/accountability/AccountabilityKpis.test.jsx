/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AccountabilityKpis from './AccountabilityKpis.jsx'
import { createMoneyFormatter } from './accountabilityHelpers.js'
import { createAppTheme } from '../../../theme.js'

const theme = createAppTheme()

const P = 'dashboard.admin.accountability'
// Echo the key plus its params so assertions can see what was interpolated.
const t = (key, params) => (params ? `${key}|${Object.values(params).join('|')}` : key)
const plain = (value) => value.replace(/[\u00a0\u202f]/g, ' ')

const fullData = {
  total_balance_cents: 100000,
  balance_trend_pct: 6.6,
  membership_fees_cents: 5000,
  membership_collected_pct: 64.6,
  total_expense_cents: 2000,
  expenses_this_month_count: 1,
  outstanding_dues_cents: 1000,
  members_pending_count: 1,
  member_accounts: [],
}

const renderKpis = (data, locale = 'es-ES') =>
  render(
    <ThemeProvider theme={theme}>
      <AccountabilityKpis
        data={data}
        formatter={createMoneyFormatter('EUR', locale)}
        locale={locale}
        t={t}
      />
    </ThemeProvider>
  )

describe('AccountabilityKpis', () => {
  it('uses the singular for one pending member (MO-16)', () => {
    renderKpis(fullData)
    expect(screen.getByText(`${P}.kpiDuesPendingOne|1`)).toBeInTheDocument()
  })

  it('uses the plural for several pending members (MO-16)', () => {
    renderKpis({ ...fullData, members_pending_count: 3 })
    expect(screen.getByText(`${P}.kpiDuesPendingOther|3`)).toBeInTheDocument()
  })

  it('formats percentages with the app locale (MO-08)', () => {
    renderKpis(fullData)
    const collected = screen.getByText((text) => text.startsWith(`${P}.kpiFeesCollected|`))
    expect(plain(collected.textContent)).toBe(`${P}.kpiFeesCollected|64,6 %`)
    const trend = screen.getByText((text) => text.startsWith(`${P}.kpiBalanceTrend|`))
    expect(plain(trend.textContent)).toBe(`${P}.kpiBalanceTrend|+6,6 %`)
  })

  it('only shows the KPIs the viewer is allowed to see (MO-14)', () => {
    renderKpis({
      ...fullData,
      total_balance_cents: null,
      balance_trend_pct: null,
      membership_fees_cents: null,
      membership_collected_pct: null,
      outstanding_dues_cents: null,
      members_pending_count: null,
    })
    expect(screen.getByText(`${P}.kpiExpenses`)).toBeInTheDocument()
    expect(screen.queryByText(`${P}.kpiBalance`)).not.toBeInTheDocument()
    expect(screen.queryByText(`${P}.kpiFees`)).not.toBeInTheDocument()
    expect(screen.queryByText(`${P}.kpiDues`)).not.toBeInTheDocument()
  })
})
