/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import TransactionLedger from './TransactionLedger.jsx'
import { createMoneyFormatter } from './accountabilityHelpers.js'

const P = 'dashboard.admin.accountability'
const t = (key) => key

const page = {
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

const renderLedger = (props = {}) =>
  render(
    <TransactionLedger
      t={t}
      formatter={createMoneyFormatter('EUR', 'es-ES')}
      locale="es-ES"
      page={page}
      filter="all"
      onFilterChange={vi.fn()}
      onPrev={vi.fn()}
      onNext={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />
  )

describe('TransactionLedger', () => {
  it('formats dates with the app locale (MO-08)', () => {
    renderLedger()
    expect(screen.getByText(/^01 mar/)).toBeInTheDocument()
  })

  it('shows a filter only for the given types (MO-13)', () => {
    renderLedger({ filterTypes: ['income', 'expense'] })
    expect(screen.getByText(`${P}.filterAll`)).toBeInTheDocument()
    expect(screen.getByText(`${P}.expense`)).toBeInTheDocument()
  })

  it('hides the filter when a single type is visible (MO-13)', () => {
    renderLedger({ filterTypes: ['income'] })
    expect(screen.queryByText(`${P}.filterAll`)).not.toBeInTheDocument()
  })

  it('uses the custom description and empty message (MO-13)', () => {
    renderLedger({
      page: { ...page, items: [], total: 0, total_pages: 0 },
      description: 'only income',
      emptyMessage: 'not shared',
    })
    expect(screen.getByText('only income')).toBeInTheDocument()
    expect(screen.getByText('not shared')).toBeInTheDocument()
    expect(screen.queryByText(`${P}.noTransactions`)).not.toBeInTheDocument()
  })
})
