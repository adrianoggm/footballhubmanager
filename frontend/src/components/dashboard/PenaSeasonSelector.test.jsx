/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardContext } from '../../context/dashboardContext.js'
import PenaSeasonSelector from './PenaSeasonSelector.jsx'

const seasons = [
  { guid: 's-current', start_date: '2026-06-01', end_date: '2027-05-31' },
  { guid: 's-previous', start_date: '2025-06-01', end_date: '2026-05-31' },
]

function renderSelector(activeSuffix) {
  render(
    <DashboardContext.Provider
      value={{
        loading: false,
        selectedPenaGuid: 'p1',
        seasons,
        selectedSeasonGuid: 's-current',
        onSelectSeason: vi.fn(),
        activeSeason: seasons[0],
        labels: { season: 'Season', activeSuffix },
      }}
    >
      <PenaSeasonSelector />
    </DashboardContext.Provider>
  )
  fireEvent.mouseDown(screen.getByRole('combobox'))
}

describe('PenaSeasonSelector', () => {
  it('U-08: marks the active season once, without nested parentheses', () => {
    renderSelector(' (Active)')

    expect(screen.getByRole('option', { name: '26/27 (Active)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '25/26' })).toBeInTheDocument()
  })
})
