/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UserAccountabilitySection from './UserAccountabilitySection.jsx'
import { userService } from '../../services/userService.js'
import { createAppTheme } from '../../theme.js'

vi.mock('../../services/userService.js', () => ({
  userService: {
    getPenaAccountability: vi.fn(),
    listPenaTransactions: vi.fn(),
  },
}))

const theme = createAppTheme()

const A = 'dashboard.admin.accountability'
const U = 'dashboard.user.accountability'
const t = (key, params) => (params ? `${key}|${Object.values(params).join('|')}` : key)

const emptyPage = { items: [], page: 1, page_size: 8, total: 0, total_pages: 0 }
const incomePage = {
  items: [
    {
      guid: 'tx-1',
      type: 'income',
      amount_cents: 5000,
      entity: 'Ana',
      concept: 'Cuota',
      occurred_on: '2026-03-01',
    },
  ],
  page: 1,
  page_size: 8,
  total: 1,
  total_pages: 1,
}

const accountability = (budget, expenses, extra = {}) => ({
  currency: 'EUR',
  budget_visibility: budget,
  expenses_visibility: expenses,
  member_accounts: [],
  my_account: null,
  monthly_cashflow: [],
  total_balance_cents: null,
  balance_trend_pct: null,
  total_income_cents: null,
  total_expense_cents: null,
  expenses_this_month_count: null,
  membership_fees_cents: null,
  membership_collected_pct: null,
  outstanding_dues_cents: null,
  members_pending_count: null,
  ...extra,
})

const renderSection = async (data, page = emptyPage) => {
  userService.getPenaAccountability.mockResolvedValue(data)
  userService.listPenaTransactions.mockResolvedValue(page)
  render(
    <ThemeProvider theme={theme}>
      <UserAccountabilitySection penaGuid="pena-1" currentPlayerGuid="p-1" language="es" t={t} />
    </ThemeProvider>
  )
  await waitFor(() => expect(userService.listPenaTransactions).toHaveBeenCalled())
  await screen.findByText(`${A}.ledgerTitle`)
}

describe('UserAccountabilitySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows expense KPIs and the cash flow with a private budget (MO-14)', async () => {
    await renderSection(
      accountability('private', 'summary', {
        total_expense_cents: 3000,
        expenses_this_month_count: 1,
        monthly_cashflow: [{ year: 2026, month: 3, income_cents: null, expense_cents: 3000 }],
      })
    )
    expect(await screen.findByText(`${A}.kpiExpenses`)).toBeInTheDocument()
    expect(screen.queryByText(`${A}.kpiBalance`)).not.toBeInTheDocument()
    expect(screen.getByText(`${A}.cashflowButton`)).toBeInTheDocument()
    expect(screen.queryByText(`${U}.privateMessage`)).not.toBeInTheDocument()
  })

  it('keeps the private message when nothing is shared', async () => {
    await renderSection(accountability('private', 'private'))
    expect(await screen.findByText(`${U}.privateMessage`)).toBeInTheDocument()
    expect(screen.queryByText(`${A}.cashflowButton`)).not.toBeInTheDocument()
  })

  it('says the detail is not shared instead of "no movements" (MO-13)', async () => {
    await renderSection(accountability('summary', 'summary', { total_income_cents: 5000 }))
    expect(await screen.findByText(`${A}.ledgerDetailNotShared`)).toBeInTheDocument()
    expect(screen.queryByText(`${A}.noTransactions`)).not.toBeInTheDocument()
  })

  it('describes an income-only ledger without a filter (MO-13)', async () => {
    await renderSection(accountability('full', 'private'), incomePage)
    expect(await screen.findByText(`${A}.ledgerDescriptionIncome`)).toBeInTheDocument()
    expect(screen.queryByText(`${A}.ledgerDescription`)).not.toBeInTheDocument()
    expect(screen.queryByText(`${A}.filterAll`)).not.toBeInTheDocument()
  })

  it('offers the type filter when both types are visible (MO-13)', async () => {
    await renderSection(accountability('full', 'full'), incomePage)
    expect(await screen.findByText(`${A}.filterAll`)).toBeInTheDocument()
  })
})
