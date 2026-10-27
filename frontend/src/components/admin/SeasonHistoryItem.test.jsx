/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { messages } from '../../i18n/messages.js'
import { ThemeModeProvider } from '../../theme/ThemeModeProvider.jsx'
import { formatIsoDate } from '../../utils/dateFormat.js'
import { SeasonHistoryItem } from './SeasonHistoryItem.jsx'

const t = (key, params = {}) => {
  const value = key.split('.').reduce((node, part) => node?.[part], messages.es)
  if (typeof value !== 'string') return key
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
}

const season = {
  guid: 's1',
  start_date: '2026-09-01',
  end_date: '2027-06-30',
  points_win: 3,
  points_draw: 1,
  points_loss: 0,
}

const renderItem = (props) =>
  render(
    <ThemeModeProvider>
      <SeasonHistoryItem
        season={season}
        formatDate={formatIsoDate}
        t={t}
        isSelected={false}
        onSelect={vi.fn()}
        {...props}
      />
    </ThemeModeProvider>
  )

describe('SeasonHistoryItem (PL-20)', () => {
  it('marks the active season', () => {
    renderItem({ isActive: true })
    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('does not mark inactive seasons', () => {
    renderItem({ isActive: false })
    expect(screen.queryByText('Activa')).not.toBeInTheDocument()
  })

  it('renders the range as DD/MM/YYYY like the date inputs', () => {
    renderItem({})
    expect(screen.getByText('01/09/2026 - 30/06/2027')).toBeInTheDocument()
  })
})
