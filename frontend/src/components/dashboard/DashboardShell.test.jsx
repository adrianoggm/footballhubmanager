/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardContext } from '../../context/dashboardContext.js'
import { I18nProvider } from '../../i18n/I18nProvider.jsx'
import { createAppTheme } from '../../theme.js'
import DashboardShell from './DashboardShell.jsx'

const seasons = [
  { guid: 's-current', start_date: '2026-06-01', end_date: '2027-05-31' },
  { guid: 's-previous', start_date: '2025-06-01', end_date: '2026-05-31' },
]

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'home', shortcut: 'G R' },
  { id: 'matches', label: 'Matches', icon: 'ball', shortcut: 'G P' },
  { id: 'accountability', label: 'Accountability', icon: 'wallet', shortcut: 'G C' },
  { id: 'players', label: 'Players', icon: 'users', shortcut: 'G J' },
]

const mockViewport = (isDesktop) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query) => ({
      matches: query.includes('min-width') ? isDesktop : !isDesktop,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  )
}

function renderShell({ selectedSeasonGuid = 's-current', props = {} } = {}) {
  const onSelectSeason = vi.fn()
  const onNavChange = vi.fn()
  const newMatch = vi.fn()
  render(
    <I18nProvider>
      <ThemeProvider theme={createAppTheme('ember-dark')}>
        <DashboardContext.Provider
          value={{
            loading: false,
            selectedPenaGuid: 'p1',
            seasons,
            selectedSeasonGuid,
            selectedSeason: seasons.find((season) => season.guid === selectedSeasonGuid),
            activeSeason: seasons[0],
            onSelectSeason,
          }}
        >
          <DashboardShell
            navItems={navItems}
            activeNavId="overview"
            onNavChange={onNavChange}
            createActions={[
              {
                id: 'newMatch',
                label: 'New match',
                icon: 'plus',
                shortcut: 'N P',
                onClick: newMatch,
              },
            ]}
            mobileNav={[
              { id: 'overview', label: 'Overview', icon: 'home', kind: 'nav' },
              { id: 'matches', label: 'Matches', icon: 'ball', kind: 'nav' },
              { id: 'create', label: 'New', icon: 'plus', kind: 'create' },
              { id: 'accountability', label: 'Cash', icon: 'wallet', kind: 'nav' },
              { id: 'more', label: 'More', icon: 'more', kind: 'more' },
            ]}
            moreNavIds={['players']}
            title="Overview"
            penaSwitcher={{ pena: { name: 'Peña El Rondo', meta: 'Admin' }, penas: [] }}
            commandItems={[
              {
                id: 'p1',
                group: 'players',
                label: 'Fernando Ruiz',
                searchOnly: true,
                onSelect: vi.fn(),
              },
            ]}
            account={{
              onOpenSettings: vi.fn(),
              onRefresh: vi.fn(),
              refreshLabel: 'Refresh data',
              onLogout: vi.fn(),
              logoutLabel: 'Logout',
            }}
            {...props}
          >
            <p>Section body</p>
          </DashboardShell>
        </DashboardContext.Provider>
      </ThemeProvider>
    </I18nProvider>
  )
  return { onSelectSeason, onNavChange, newMatch }
}

describe('DashboardShell (redesign F1)', () => {
  beforeEach(() => {
    window.localStorage.setItem('footballhubmanager.language', 'en')
    mockViewport(true)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('U-08: the season chip marks the active season once', async () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: /Select season: 2026\/27/ }))

    const menu = await screen.findByRole('menu')
    const items = within(menu).getAllByRole('menuitem')
    expect(items[0]).toHaveTextContent('2026/27Active')
    expect(items[1]).toHaveTextContent('2025/26')
    expect(items[1]).not.toHaveTextContent('Active')
  })

  it('shows the read-only strip for a past season and returns to the active one', () => {
    const { onSelectSeason } = renderShell({ selectedSeasonGuid: 's-previous' })

    expect(screen.getByText('You are viewing 2025/26 (read only)')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to the active season' }))
    expect(onSelectSeason).toHaveBeenCalledWith('s-current')
  })

  it('hides the strip on the active season', () => {
    renderShell()
    expect(screen.queryByText(/read only\)/)).not.toBeInTheDocument()
  })

  it('navigates with G + letter and creates with N + letter', () => {
    const { onNavChange, newMatch } = renderShell()
    fireEvent.keyDown(window, { key: 'g' })
    fireEvent.keyDown(window, { key: 'p' })
    expect(onNavChange).toHaveBeenCalledWith('matches')

    fireEvent.keyDown(window, { key: 'n' })
    fireEvent.keyDown(window, { key: 'p' })
    expect(newMatch).toHaveBeenCalled()
  })

  it('opens the command palette with Ctrl+K and runs the highlighted item', async () => {
    const { onNavChange } = renderShell()
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    const input = await screen.findByRole('combobox', { name: /Search sections/ })
    fireEvent.change(input, { target: { value: 'accou' } })
    expect(screen.getByRole('option', { name: /Accountability/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Fernando/ })).not.toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(onNavChange).toHaveBeenCalledWith('accountability'))
  })

  it('renders the sidebar with settings and logout on desktop', () => {
    renderShell()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Settings & profile/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Overview/ })).toHaveAttribute('aria-current', 'page')
  })

  it('renders a 5-destination bottom navigation on phones with a create sheet', async () => {
    mockViewport(false)
    const { newMatch } = renderShell()

    const bottomNav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(bottomNav).getAllByRole('button')).toHaveLength(5)

    fireEvent.click(within(bottomNav).getByRole('button', { name: 'New' }))
    fireEvent.click(await screen.findByRole('button', { name: 'New match' }))
    expect(newMatch).toHaveBeenCalled()
  })
})
