/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createTestT } from '../../../i18n/testUtils.js'
import { createAppTheme } from '../../../theme.js'
import NextMatchCard from './NextMatchCard.jsx'

const t = createTestT('en')

const renderCard = (match) =>
  render(
    <ThemeProvider theme={createAppTheme()}>
      <NextMatchCard match={match} t={t} formatDate={(iso) => iso} />
    </ThemeProvider>
  )

// MT-12: the call-up showed the team name plus "+N" (players - 1), which read
// as "team + N players" instead of the actual number of called-up players.
describe('NextMatchCard call-up', () => {
  it('shows the number of called-up players per side', () => {
    renderCard({
      match_date: '2026-10-30',
      home_team_name: 'Reds',
      away_team_name: 'Blues',
      home_players: 5,
      away_players: 1,
    })
    expect(screen.getByText('5 players')).toBeInTheDocument()
    expect(screen.getByText('1 player')).toBeInTheDocument()
    expect(screen.queryByText('+4')).not.toBeInTheDocument()
  })

  it('shows an explicit empty call-up when no players are listed', () => {
    renderCard({
      match_date: '2026-10-30',
      home_team_name: 'Reds',
      away_team_name: 'Blues',
      home_players: 0,
    })
    expect(screen.getAllByText('0 players')).toHaveLength(2)
  })
})
