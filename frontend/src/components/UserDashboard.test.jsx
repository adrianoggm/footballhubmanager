/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Player dashboard regressions from the QA pass (U-xx). The real UserDashboard
// is mounted against a mocked userService holding two peñas, each with its own
// season, so cross-peña requests are detectable.
const { userServiceMock, authServiceMock } = vi.hoisted(() => {
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
  return {
    authServiceMock: {
      getAccountEmail: vi.fn(async () => ({ email: 'player@example.com', email_verified: true })),
    },
    userServiceMock: {
      page,
      seasonFor,
      getMyProfile: vi.fn(async () => ({
        guid: 'player-1',
        name: 'Alvaro',
        surname1: 'Garcia',
        surname2: '',
        nationality: 'Spain',
        image_url: '',
      })),
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
      listStandings: vi.fn(async () =>
        page([
          {
            player_guid: 'player-1',
            player_name: 'Alvaro Garcia',
            points: 7,
            played: 3,
            wins: 2,
            draws: 1,
            losses: 0,
          },
        ])
      ),
      listSeasonMatches: vi.fn(async (penaGuid) =>
        page([
          { guid: `m1-${penaGuid}`, match_date: '2026-07-01', status: 'closed' },
          { guid: `m2-${penaGuid}`, match_date: '2026-07-08', status: 'closed' },
        ])
      ),
      getMatchDetail: vi.fn(async () => null),
      getMatchInsights: vi.fn(async () => ({ items: [] })),
      updateMyMembership: vi.fn(async (penaGuid, payload) => ({ ...payload, role: 'member' })),
      updateMyProfile: vi.fn(async (payload) => payload),
    },
  }
})

vi.mock('../services/userService.js', () => ({ userService: userServiceMock }))
vi.mock('../services/authService.js', () => ({ authService: authServiceMock }))

import { I18nProvider } from '../i18n/I18nProvider.jsx'
import { ThemeModeProvider } from '../theme/ThemeModeProvider.jsx'
import ToastProvider from './common/ToastProvider.jsx'
import UserDashboard from './UserDashboard.jsx'

const session = { user_guid: 'player-1', user_type: 'user' }

function DashboardHarness({ sectionId }) {
  return (
    <I18nProvider>
      <ThemeModeProvider>
        <ToastProvider>
          <UserDashboard
            session={session}
            onLogout={vi.fn()}
            routeSectionId={sectionId}
            onSectionChange={vi.fn()}
          />
        </ToastProvider>
      </ThemeModeProvider>
    </I18nProvider>
  )
}

function renderDashboard(sectionId = 'membership') {
  const utils = render(<DashboardHarness sectionId={sectionId} />)
  return {
    ...utils,
    goTo: (nextSectionId) => utils.rerender(<DashboardHarness sectionId={nextSectionId} />),
  }
}

// Generous timeout: the first mount pays the lazy MUI/shell import cost when
// the whole suite runs in parallel.
describe('UserDashboard QA regressions', { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('U-06: clicking a pena chip in My Penas switches the current pena', async () => {
    renderDashboard('membership')
    await screen.findByText('Membership in Pena Alpha')

    fireEvent.click(screen.getByRole('button', { name: 'Pena Beta' }))

    expect(await screen.findByText('Membership in Pena Beta')).toBeInTheDocument()
    await waitFor(() => expect(userServiceMock.getMyMembership).toHaveBeenCalledWith('pB'))
  })

  it("U-03: switching pena never requests data with the previous pena's season", async () => {
    renderDashboard('matches')
    await waitFor(() =>
      expect(userServiceMock.listSeasonMatches).toHaveBeenCalledWith(
        'pA',
        'season-pA',
        expect.anything()
      )
    )

    await selectPenaFromSwitcher('Pena Beta')

    await waitFor(() =>
      expect(userServiceMock.listSeasonMatches).toHaveBeenCalledWith(
        'pB',
        'season-pB',
        expect.anything()
      )
    )
    expect(userServiceMock.listSeasonMatches).not.toHaveBeenCalledWith(
      'pB',
      'season-pA',
      expect.anything()
    )
    expect(screen.queryByText(/season not found/i)).not.toBeInTheDocument()
  })

  it('U-04 / 5.9: no repeated KPI cards, but standings and matches still load for every section', async () => {
    renderDashboard('membership')
    await screen.findByText('Membership in Pena Alpha')

    await waitFor(() =>
      expect(userServiceMock.listSeasonMatches).toHaveBeenCalledWith(
        'pA',
        'season-pA',
        expect.anything()
      )
    )
    await waitFor(() => expect(userServiceMock.listStandings).toHaveBeenCalled())
    expect(screen.queryByText('#1')).not.toBeInTheDocument()
    expect(screen.queryByText('Your points: 7', { exact: false })).not.toBeInTheDocument()
  })

  it('U-08: the user season chip marks the active season', async () => {
    renderDashboard('membership')
    await screen.findByText('Membership in Pena Alpha')

    fireEvent.click(screen.getByRole('button', { name: /: 2026\/27$/ }))

    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /2026\/27\s*Active/ })).toBeInTheDocument()
  })

  it('U-16: settings, refresh and logout stay reachable from the shell (admin parity)', async () => {
    renderDashboard('membership')
    await screen.findByText('Membership in Pena Alpha')

    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings & profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Logout' })).toBeInTheDocument()
  })

  it('switches pena from the sidebar switcher, which also offers "Join a pena"', async () => {
    const onSectionChange = vi.fn()
    render(
      <I18nProvider>
        <ThemeModeProvider>
          <ToastProvider>
            <UserDashboard
              session={session}
              onLogout={vi.fn()}
              routeSectionId="membership"
              onSectionChange={onSectionChange}
            />
          </ToastProvider>
        </ThemeModeProvider>
      </I18nProvider>
    )
    await screen.findByText('Membership in Pena Alpha')

    fireEvent.click(screen.getByRole('button', { name: /Switch pena/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Join a pena' }))
    expect(onSectionChange).toHaveBeenCalledWith('join')

    await selectPenaFromSwitcher('Pena Beta')
    expect(await screen.findByText('Membership in Pena Beta')).toBeInTheDocument()
  })

  it('U-12: "Add email" opens settings with the email field focused', async () => {
    authServiceMock.getAccountEmail.mockResolvedValueOnce({ email: null, email_verified: false })
    renderDashboard('membership')

    fireEvent.click(await screen.findByRole('button', { name: 'Add email' }))

    const dialog = await screen.findByRole('dialog')
    const emailInput = within(dialog).getByLabelText('Email')
    await waitFor(() => expect(emailInput).toHaveFocus())
  })
})

// Peña switching moved from the settings dialog to the sidebar switcher (F1).
async function selectPenaFromSwitcher(penaName) {
  fireEvent.click(screen.getByRole('button', { name: /Switch pena/ }))
  const popover = await screen.findByRole('presentation')
  fireEvent.click(within(popover).getByRole('button', { name: new RegExp(penaName) }))
}
