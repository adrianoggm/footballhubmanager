/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import UserMatchesSection from '../user/UserMatchesSection.jsx'
import UserStandingsSection from '../user/UserStandingsSection.jsx'

// U-05: on narrow screens (390px) the row action / key result column of wide
// tables must stay reachable: it is pinned to the right edge of the scroll area.
const isPinned = (cell) => {
  const style = window.getComputedStyle(cell)
  return style.position === 'sticky' && style.right === '0px'
}

const t = (key) => key

describe('responsive tables (U-05)', () => {
  it('pins the "View detail" action column in the user matches table', () => {
    render(
      <UserMatchesSection
        orderedSeasonMatches={[
          {
            guid: 'm1',
            match_date: '2026-07-01',
            home_team_name: 'Home',
            away_team_name: 'Away',
            status: 'closed',
            home_score: 1,
            away_score: 0,
          },
        ]}
        matchDetailLoading={false}
        onOpenMatchDetail={vi.fn()}
        t={t}
        formatDate={(value) => value}
      />
    )

    const actionCell = screen.getByText('dashboard.common.matchDetail.viewAction').closest('td')
    expect(isPinned(actionCell)).toBe(true)
    expect(isPinned(screen.getByText('dashboard.user.table.actions').closest('th'))).toBe(true)
  })

  it('pins the points column in the user standings table', () => {
    render(
      <UserStandingsSection
        seasonDataLoading={false}
        standings={[
          {
            player_guid: 'p1',
            name: 'Ana',
            surname1: 'Lopez',
            points: 9,
            wins: 3,
            draws: 0,
            losses: 0,
          },
        ]}
        currentStanding={null}
        currentPlayerGuid=""
        t={t}
      />
    )

    expect(isPinned(screen.getByText('dashboard.user.table.pts').closest('th'))).toBe(true)
    expect(isPinned(screen.getByText('9').closest('td'))).toBe(true)
  })
})
