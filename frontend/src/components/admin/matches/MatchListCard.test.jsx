/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MatchListCard from './MatchListCard.jsx'

const match = (overrides) => ({
  guid: 'm1',
  match_date: '2026-10-27',
  status: 'open',
  home_team_name: 'Reds',
  away_team_name: 'Blues',
  home_score: 0,
  away_score: 0,
  tracking_status: 'live',
  started_at_epoch: 1000,
  elapsed_seconds: 65,
  ...overrides,
})

const renderList = (matches) =>
  render(
    <MatchListCard
      selectedSeasonGuid="season-1"
      seasonMatchesLoading={false}
      visibleSeasonMatches={matches}
      selectedMatchGuid=""
      selectedTrackedScore={null}
      deletingMatchGuid=""
      matchStatsLoading={false}
      onManageMatch={vi.fn()}
      onRequestDeleteMatch={vi.fn()}
      t={(key) => key}
      formatDate={(iso) => iso}
      formatElapsedDuration={(seconds) => `clock-${seconds}`}
    />
  )

// MT-08: the list-row clock showed the stored elapsed_seconds and never ticked.
describe('MatchListCard clock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-27T18:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks the elapsed time of a live match', () => {
    renderList([match()])
    expect(screen.getByText('clock-65')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('clock-68')).toBeInTheDocument()
  })

  it('keeps paused and finished clocks frozen', () => {
    renderList([
      match({ guid: 'paused', tracking_status: 'paused', elapsed_seconds: 30 }),
      match({ guid: 'done', tracking_status: 'finished', elapsed_seconds: 3000 }),
    ])
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('clock-30')).toBeInTheDocument()
    expect(screen.getByText('clock-3000')).toBeInTheDocument()
  })
})
