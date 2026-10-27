/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import AppFooter from './AppFooter.jsx'
import PaginatedTable from './PaginatedTable.jsx'

// U-13: at 390px wide, tappable controls need at least a 40px touch area.
const PHONE_WIDTH = 390

const minSize = (element) => {
  const style = window.getComputedStyle(element)
  return {
    minHeight: parseFloat(style.minHeight) || 0,
    minWidth: parseFloat(style.minWidth) || 0,
  }
}

describe('touch targets on phones (U-13)', () => {
  let originalWidth

  beforeEach(() => {
    originalWidth = window.innerWidth
    window.happyDOM.setViewport({ width: PHONE_WIDTH, height: 844 })
  })

  afterEach(() => {
    window.happyDOM.setViewport({ width: originalWidth, height: 768 })
  })

  it('footer links are at least 40px tall', () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <AppFooter />
        </MemoryRouter>
      </I18nProvider>
    )

    expect(minSize(screen.getByRole('link', { name: 'GitHub' })).minHeight).toBeGreaterThanOrEqual(
      40
    )
  })

  it('table pagination buttons are at least 40x40', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ id: index, name: `Row ${index}` }))
    render(
      <PaginatedTable
        columns={[{ key: 'name', label: 'Name' }]}
        rows={rows}
        getRowKey={(row) => row.id}
        defaultRowsPerPage={10}
      />
    )

    const nextPage = screen.getByRole('button', { name: /next page/i })
    expect(minSize(nextPage).minHeight).toBeGreaterThanOrEqual(40)
    expect(minSize(nextPage).minWidth).toBeGreaterThanOrEqual(40)
  })
})
