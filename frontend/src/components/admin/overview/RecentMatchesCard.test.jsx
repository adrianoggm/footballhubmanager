/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createTestT } from '../../../i18n/testUtils.js'
import { createAppTheme } from '../../../theme.js'
import RecentMatchesCard from './RecentMatchesCard.jsx'

const t = createTestT('en')

const match = (guid, status, matchDate) => ({
  guid,
  status,
  match_date: matchDate,
  home_team_name: `Home ${guid}`,
  away_team_name: `Away ${guid}`,
  home_score: 1,
  away_score: 0,
})

// MT-14: the header said "Last 3" while only 2 played matches were listed
// (the third most recent one was still upcoming).
describe('RecentMatchesCard', () => {
  it('labels the header with the number of matches actually listed', () => {
    render(
      <ThemeProvider theme={createAppTheme()}>
        <RecentMatchesCard
          matches={[
            match('upcoming', 'open', '2026-11-02'),
            match('a', 'closed', '2026-10-20'),
            match('b', 'closed', '2026-10-13'),
          ]}
          t={t}
          onOpenMatchDetail={vi.fn()}
          onViewAll={vi.fn()}
        />
      </ThemeProvider>
    )
    expect(screen.getByText('Last 2')).toBeInTheDocument()
    expect(screen.queryByText('Last 3')).not.toBeInTheDocument()
  })
})
