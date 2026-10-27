/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// U-01 / U-02: the dashboard selection (pena + season) must survive section
// navigation (and, for the pena, a reload). Mounted through the real router so
// a per-route remount of the dashboard is caught.
const { userServiceMock, adminServiceMock } = vi.hoisted(() => {
  const page = (items = []) => ({
    items,
    total: items.length,
    total_pages: 1,
    page: 1,
    page_size: 100,
  })
  const seasonFor = (penaGuid) => ({
    guid: `season-${penaGuid}`,
    start_date: '2026-06-01',
    end_date: '2027-05-31',
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    is_active: true,
  })
  const adminSeasons = [
    { ...seasonFor('p1'), guid: 's-current' },
    {
      ...seasonFor('p1'),
      guid: 's-previous',
      start_date: '2024-06-01',
      end_date: '2025-05-31',
      is_active: false,
    },
  ]
  return {
    userServiceMock: {
      getMyProfile: vi.fn(async () => ({ guid: 'player-1', name: 'Alvaro', surname1: 'Garcia' })),
      listMyPenas: vi.fn(async () =>
        page([
          { guid: 'pA', name: 'Pena Alpha' },
          { guid: 'pB', name: 'Pena Beta' },
        ])
      ),
      getNationalities: vi.fn(async () => ['Spain']),
      getMyMembership: vi.fn(async (penaGuid) => ({
        nickname: `nick-${penaGuid}`,
        position: '',
        role: 'member',
      })),
      getPenaLabels: vi.fn(async () => ({ position_labels: [], role_labels: ['member'] })),
      getActiveSeason: vi.fn(async (penaGuid) => seasonFor(penaGuid)),
      listSeasons: vi.fn(async (penaGuid) => page([seasonFor(penaGuid)])),
      listStandings: vi.fn(async () => page([])),
      listSeasonMatches: vi.fn(async () => page([])),
      getMatchDetail: vi.fn(async () => null),
      getMatchInsights: vi.fn(async () => ({ items: [] })),
      updateMyMembership: vi.fn(async (penaGuid, payload) => ({ ...payload, role: 'member' })),
    },
    adminServiceMock: {
      getPenas: vi.fn(async () => page([{ guid: 'p1', name: 'Test Pena' }])),
      getNationalities: vi.fn(async () => ['Spain']),
      getActiveSeason: vi.fn(async () => adminSeasons[0]),
      listSeasons: vi.fn(async () => page(adminSeasons)),
      getPenaLabels: vi.fn(async () => ({
        role_labels: ['member'],
        position_labels: [],
        role_colors: {},
        position_colors: {},
      })),
      listStandings: vi.fn(async () => page([])),
      listSeasonMatches: vi.fn(async () => page([])),
      listPenaPlayers: vi.fn(async () => page([])),
      listSeasonPlayers: vi.fn(async () => page([])),
      getMatchInsights: vi.fn(async () => ({ items: [] })),
    },
  }
})

vi.mock('../services/userService.js', () => ({ userService: userServiceMock }))
vi.mock('../services/adminService.js', () => ({ adminService: adminServiceMock }))
vi.mock('../services/authService.js', () => ({
  authService: {
    getAccountEmail: vi.fn(async () => ({ email: 'someone@example.com', email_verified: true })),
  },
}))

import { I18nProvider } from '../i18n/I18nProvider.jsx'
import { ThemeModeProvider } from '../theme/ThemeModeProvider.jsx'
import ToastProvider from '../components/common/ToastProvider.jsx'
import AppRouter from './AppRouter.jsx'

function renderApp(path, session) {
  window.history.pushState({}, '', path)
  return render(
    <I18nProvider>
      <ThemeModeProvider>
        <ToastProvider>
          <AppRouter auth={{ session }} onLogout={vi.fn()} />
        </ToastProvider>
      </ThemeModeProvider>
    </I18nProvider>
  )
}

function navigateTo(path) {
  act(() => {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  })
}

const userSession = { user_guid: 'player-1', user_type: 'user' }
const adminSession = { user_guid: 'admin-1', user_type: 'admin' }

describe('Dashboard selection across sections', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('U-01: keeps the selected pena across sections and saves membership to it', async () => {
    renderApp('/app/user/membership', userSession)
    await screen.findByText('Membership in Pena Alpha', {}, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Pena Beta' }))
    await screen.findByText('Membership in Pena Beta')

    navigateTo('/app/user/matches')
    await waitFor(() =>
      expect(userServiceMock.listSeasonMatches).toHaveBeenCalledWith(
        'pB',
        'season-pB',
        expect.anything()
      )
    )
    navigateTo('/app/user/membership')

    await screen.findByText('Membership in Pena Beta', {}, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Save membership' }))
    await waitFor(() => expect(userServiceMock.updateMyMembership).toHaveBeenCalled())
    expect(userServiceMock.updateMyMembership).toHaveBeenCalledWith('pB', expect.anything())
    expect(userServiceMock.updateMyMembership).not.toHaveBeenCalledWith('pA', expect.anything())
    // Section navigation no longer re-runs the dashboard bootstrap requests.
    expect(userServiceMock.listMyPenas).toHaveBeenCalledTimes(1)
    expect(userServiceMock.getMyProfile).toHaveBeenCalledTimes(1)
  })

  it('U-01: restores the selected pena after a reload', async () => {
    renderApp('/app/user/membership', userSession)
    await screen.findByText('Membership in Pena Alpha', {}, { timeout: 5000 })
    fireEvent.click(screen.getByRole('button', { name: 'Pena Beta' }))
    await screen.findByText('Membership in Pena Beta')

    cleanup()
    renderApp('/app/user/membership', userSession)

    expect(
      await screen.findByText('Membership in Pena Beta', {}, { timeout: 5000 })
    ).toBeInTheDocument()
  })

  it('U-02: keeps the admin reference season across sections', async () => {
    renderApp('/app/admin/overview', adminSession)
    // Topbar season chip (redesign F1); its accessible name ends with the season.
    const seasonChip = await screen.findByRole('button', { name: /: 2026\/27$/ }, { timeout: 5000 })
    await waitFor(() => expect(seasonChip).toBeEnabled())

    fireEvent.click(seasonChip)
    const menu = await screen.findByRole('menu')
    fireEvent.click(within(menu).getByText('2024/25'))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /: 2024\/25$/ })).toBeInTheDocument()
    )

    navigateTo('/app/admin/players')
    await waitFor(() =>
      expect(adminServiceMock.listSeasonPlayers).toHaveBeenCalledWith(
        'p1',
        's-previous',
        expect.anything()
      )
    )
    expect(screen.getByRole('button', { name: /: 2024\/25$/ })).toBeInTheDocument()
    expect(adminServiceMock.getPenas).toHaveBeenCalledTimes(1)
  })
})
