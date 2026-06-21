/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import StatusChip from './StatusChip.jsx'

const t = (key) => key

describe('StatusChip', () => {
  it('renders the closed status chip', () => {
    render(<StatusChip status="closed" t={t} />)
    expect(screen.getByText('dashboard.user.statusClosed')).toBeInTheDocument()
  })

  it('adds a tracking chip when the match is live', () => {
    render(<StatusChip status="open" trackingStatus="live" t={t} />)
    expect(screen.getByText('dashboard.user.statusOpen')).toBeInTheDocument()
    expect(screen.getByText('dashboard.common.matchDetail.trackingLive')).toBeInTheDocument()
  })

  it('shows no tracking chip when the match has not started', () => {
    render(<StatusChip status="open" trackingStatus="not_started" t={t} />)
    expect(
      screen.queryByText('dashboard.common.matchDetail.trackingNotStarted')
    ).not.toBeInTheDocument()
  })
})
