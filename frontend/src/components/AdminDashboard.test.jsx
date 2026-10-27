/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Integration safety net for dashboard hook extraction. We mount the real
// AdminDashboard against a mocked HTTP service and assert its orchestration:
// the initial load chain and each section's data loader. These are the loader
// contracts a feature-hook split must preserve.
//
// Note: the section bodies are React.lazy and do not resolve under vitest, so
// these tests assert loader wiring (driven by the dashboard's own effects),
// not section-internal UI. Section UI is covered by component tests.
//
// vi.hoisted so the mock object exists before the hoisted vi.mock factory runs.
const { adminServiceMock } = vi.hoisted(() => {
  const season = {
    guid: 's1',
    start_date: '2026-06-01',
    end_date: '2026-09-01',
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    is_active: true,
  }
  const labels = {
    role_labels: ['member'],
    position_labels: ['Delantero'],
    role_colors: { member: '#15803d' },
    position_colors: { Delantero: '#ef4444' },
  }
  const page = (items = []) => ({
    items,
    total: items.length,
    total_pages: 1,
    page: 1,
    page_size: 25,
  })
  return {
    adminServiceMock: {
      getPenas: vi.fn(async () => page([{ guid: 'p1', name: 'Test Pena' }])),
      getNationalities: vi.fn(async () => ['Spain']),
      getActiveSeason: vi.fn(async () => season),
      listSeasons: vi.fn(async () => page([season])),
      getPenaLabels: vi.fn(async () => labels),
      listStandings: vi.fn(async () => page([])),
      listSeasonMatches: vi.fn(async () => page([])),
      listPenaPlayers: vi.fn(async () => page([])),
      listSeasonPlayers: vi.fn(async () => page([])),
      getMatchInsights: vi.fn(async () => ({ items: [] })),
      createGuestPlayer: vi.fn(async () => ({ player_guid: 'new' })),
      registerSeasonPlayer: vi.fn(async () => ({})),
    },
  }
})

vi.mock('../services/adminService.js', () => ({ adminService: adminServiceMock }))
// The account email notice loads its status through authService; keep it offline.
vi.mock('../services/authService.js', () => ({
  authService: {
    getAccountEmail: vi.fn(async () => ({ email: 'admin@example.com', email_verified: true })),
  },
}))

import { I18nProvider } from '../i18n/I18nProvider.jsx'
import { ThemeModeProvider } from '../theme/ThemeModeProvider.jsx'
import ToastProvider from './common/ToastProvider.jsx'
import AdminDashboard from './AdminDashboard.jsx'

function renderDashboard(routeSectionId = 'overview') {
  return render(
    <I18nProvider>
      <ThemeModeProvider>
        <ToastProvider>
          <AdminDashboard
            session={{ user_guid: 'admin-1', user_type: 'admin' }}
            onLogout={vi.fn()}
            routeSectionId={routeSectionId}
            onSectionChange={vi.fn()}
          />
        </ToastProvider>
      </ThemeModeProvider>
    </I18nProvider>
  )
}

describe('AdminDashboard (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mounts and runs the initial load chain (penas -> active season -> seasons)', async () => {
    renderDashboard('overview')
    await waitFor(() => expect(adminServiceMock.getActiveSeason).toHaveBeenCalledWith('p1'))
    expect(adminServiceMock.getPenas).toHaveBeenCalled()
    expect(adminServiceMock.listSeasons).toHaveBeenCalledWith('p1', expect.anything())
  })

  it('does not request the active season for a pena without seasons (F12)', async () => {
    const empty = { items: [], total: 0, total_pages: 0, page: 1, page_size: 100 }
    const original = adminServiceMock.listSeasons.getMockImplementation()
    adminServiceMock.listSeasons.mockImplementation(async () => empty)
    try {
      renderDashboard('overview')
      await waitFor(() =>
        expect(adminServiceMock.listSeasons).toHaveBeenCalledWith('p1', expect.anything())
      )
      // Let the season-load chain settle before asserting nothing else was requested.
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(adminServiceMock.getActiveSeason).not.toHaveBeenCalled()
    } finally {
      adminServiceMock.listSeasons.mockImplementation(original)
    }
  })

  it('gives the header icon buttons translated accessible names (F2)', async () => {
    renderDashboard('overview')
    expect(await screen.findByRole('button', { name: 'Logout' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pena settings' })).toBeInTheDocument()
  })

  it('returns focus from the pena settings dialog without hitting aria-hidden (F9)', async () => {
    const user = userEvent.setup()
    renderDashboard('overview')
    const opener = await screen.findByRole('button', { name: 'Pena settings' })
    await waitFor(() => expect(opener).toBeEnabled())
    const hiddenAtFocus = []
    opener.addEventListener('focus', () =>
      hiddenAtFocus.push(Boolean(opener.closest('[aria-hidden="true"]')))
    )

    await user.click(opener)
    await screen.findByRole('dialog')
    hiddenAtFocus.length = 0
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(opener).toHaveFocus())
    expect(hiddenAtFocus).not.toContain(true)
  })

  it('loads season standings for the overview section', async () => {
    renderDashboard('overview')
    await waitFor(() => expect(adminServiceMock.listStandings).toHaveBeenCalled())
  })

  it('loads season matches when on the matches section', async () => {
    renderDashboard('matches')
    await waitFor(() => expect(adminServiceMock.listSeasonMatches).toHaveBeenCalled())
  })

  it('loads the season roster/players when on the players section', async () => {
    renderDashboard('players')
    await waitFor(() => expect(adminServiceMock.listSeasonPlayers).toHaveBeenCalled())
  })

  it('opens the new-player form from the "Add guest" quick action instead of POSTing an empty guest (PL-01)', async () => {
    const onSectionChange = vi.fn()
    render(
      <I18nProvider>
        <ThemeModeProvider>
          <ToastProvider>
            <AdminDashboard
              session={{ user_guid: 'admin-1', user_type: 'admin' }}
              onLogout={vi.fn()}
              routeSectionId="overview"
              onSectionChange={onSectionChange}
            />
          </ToastProvider>
        </ThemeModeProvider>
      </I18nProvider>
    )

    const quickAction = await screen.findByText(/^(Add Guest|Añadir invitado)$/)
    fireEvent.click(quickAction)

    expect(adminServiceMock.createGuestPlayer).not.toHaveBeenCalled()
    expect(adminServiceMock.registerSeasonPlayer).not.toHaveBeenCalled()
    expect(onSectionChange).toHaveBeenCalledWith('players')
  })
})
