/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminAccountabilitySection from './AdminAccountabilitySection.jsx'
import { adminService } from '../../services/adminService.js'
import { createAppTheme } from '../../theme.js'

vi.mock('../../services/adminService.js', () => ({
  adminService: {
    getPenaAccountability: vi.fn(),
    listPenaTransactions: vi.fn(),
    recordPenaTransaction: vi.fn(),
  },
}))

const theme = createAppTheme()

const A = 'dashboard.admin.accountability'
const t = (key) => key

const summary = {
  currency: 'EUR',
  budget_visibility: 'summary',
  expenses_visibility: 'summary',
  member_accounts: [],
  monthly_cashflow: [],
  total_balance_cents: 0,
  balance_trend_pct: null,
  total_income_cents: 0,
  total_expense_cents: 0,
  expenses_this_month_count: 0,
  membership_fees_cents: 0,
  membership_collected_pct: null,
  outstanding_dues_cents: 0,
  members_pending_count: 0,
}

const renderSection = async () => {
  render(
    <ThemeProvider theme={theme}>
      <AdminAccountabilitySection
        penaGuid="pena-1"
        players={[]}
        language="es"
        t={t}
        formatPlayerDisplayName={(player) => player.name}
      />
    </ThemeProvider>
  )
  await screen.findByText(`${A}.kpiBalance`)
}

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const submit = () => fireEvent.click(screen.getByText(`${A}.recordTransaction`))

describe('AdminAccountabilitySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminService.getPenaAccountability.mockResolvedValue(summary)
    adminService.listPenaTransactions.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 8,
      total: 0,
      total_pages: 0,
    })
  })

  it('clears a stale success notice when the next submit is invalid (MO-06)', async () => {
    adminService.recordPenaTransaction.mockResolvedValue(summary)
    await renderSection()

    fill(`${A}.amount`, '10')
    fill(`${A}.concept`, 'Cuota')
    submit()
    expect(await screen.findByText(`${A}.notices.transactionAdded`)).toBeInTheDocument()

    submit() // the form was reset: empty amount + concept
    expect(screen.queryByText(`${A}.notices.transactionAdded`)).not.toBeInTheDocument()
    expect(screen.getByText(`${A}.validation.amountRequired`)).toBeInTheDocument()
  })

  it('translates known API errors (MO-07)', async () => {
    adminService.recordPenaTransaction.mockRejectedValue(
      Object.assign(new Error('Amount out of range'), { status: 400 })
    )
    await renderSection()

    fill(`${A}.amount`, '10')
    fill(`${A}.concept`, 'Cuota')
    submit()

    expect(await screen.findByText(`${A}.errors.amountOutOfRange`)).toBeInTheDocument()
  })
})
