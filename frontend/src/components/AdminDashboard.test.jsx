/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the HTTP service so the dashboard mounts against controlled data and
// exercises the real AdminDashboard orchestration.
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
  const matchDetail = (overrides = {}) => ({
    guid: 'm1',
    season_guid: 's1',
    match_date: '2026-06-15',
    status: 'open',
    tracking_status: 'not_started',
    started_at_epoch: null,
    ended_at_epoch: null,
    elapsed_seconds: 0,
    total_paused_seconds: 0,
    paused_at_epoch: null,
    goalkeeper_rotation_seconds: 0,
    lineup_change_count: 0,
    home_team: { team_name: 'Rojos', score: 0, players: [] },
    away_team: { team_name: 'Azules', score: 0, players: [] },
    events: [],
    ...overrides,
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
      getMatchDetail: vi.fn(async () => matchDetail()),
      startMatch: vi.fn(async () =>
        matchDetail({ tracking_status: 'live', started_at_epoch: 1000 })
      ),
      stopMatch: vi.fn(async () =>
        matchDetail({ tracking_status: 'finished', status: 'closed', ended_at_epoch: 2000 })
      ),
      __matchDetail: matchDetail,
    },
  }
})

vi.mock('../services/adminService.js', () => ({ adminService: adminServiceMock }))

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

  it('mounts and runs the initial load chain (penas -> active season)', async () => {
    renderDashboard('overview')
    // loadDashboard -> select first pena -> loadPenaData(p1)
    await waitFor(() => expect(adminServiceMock.getActiveSeason).toHaveBeenCalledWith('p1'))
    expect(adminServiceMock.getPenas).toHaveBeenCalled()
    expect(adminServiceMock.listSeasons).toHaveBeenCalledWith('p1', expect.anything())
  })

  it('loads season standings for the overview section', async () => {
    renderDashboard('overview')
    await waitFor(() => expect(adminServiceMock.listStandings).toHaveBeenCalled())
  })

  it('loads season matches when on the matches section', async () => {
    renderDashboard('matches')
    await waitFor(() => expect(adminServiceMock.listSeasonMatches).toHaveBeenCalled())
  })

  // Contract the FE-4 useMatchTracking extraction must preserve: managing a match
  // and starting it dispatches startMatch and refreshes the season match list.
  it('starts a match and refreshes the match list (match-mutation contract)', async () => {
    const matchListItem = {
      guid: 'm1',
      match_date: '2026-06-15',
      home_team_name: 'Rojos',
      away_team_name: 'Azules',
      status: 'open',
      tracking_status: 'not_started',
      home_score: 0,
      away_score: 0,
      lineup_change_count: 0,
      elapsed_seconds: 0,
    }
    adminServiceMock.listSeasonMatches.mockResolvedValue({
      items: [matchListItem],
      total: 1,
      total_pages: 1,
      page: 1,
      page_size: 25,
    })

    renderDashboard('matches')

    // Open the match editor for the row.
    const manageBtn = await screen.findByRole('button', { name: /Gestionar partido/i })
    fireEvent.click(manageBtn)
    await waitFor(() => expect(adminServiceMock.getMatchDetail).toHaveBeenCalled())

    // Switch to the live-tracking tab, then start the match.
    fireEvent.click(await screen.findByRole('tab', { name: /Seguimiento en vivo/i }))
    fireEvent.click(await screen.findByRole('button', { name: /Iniciar partido/i }))

    await waitFor(() => expect(adminServiceMock.startMatch).toHaveBeenCalledWith('p1', 's1', 'm1'))
    // The handler refreshes the list after starting (initial load + post-start).
    expect(adminServiceMock.listSeasonMatches.mock.calls.length).toBeGreaterThan(1)
  })
})
