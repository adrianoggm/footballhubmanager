/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ManualEventForm from './ManualEventForm.jsx'

const baseProps = {
  matchEventDraft: {},
  onMatchEventDraftField: () => () => {},
  primaryEventPlayers: [],
  relatedEventPlayers: [],
  loading: false,
  matchStatsLoading: false,
  t: (key) => key,
}

describe('ManualEventForm', () => {
  it('shows the "show" toggle label when collapsed', () => {
    render(
      <ManualEventForm
        {...baseProps}
        show={false}
        onToggle={vi.fn()}
        handleCreateMatchEvent={vi.fn()}
      />
    )
    expect(screen.getByText('dashboard.admin.matches.manualEventShow')).toBeInTheDocument()
  })

  it('shows the hide label and a create action when expanded', () => {
    render(
      <ManualEventForm
        {...baseProps}
        show={true}
        onToggle={vi.fn()}
        handleCreateMatchEvent={vi.fn()}
      />
    )
    expect(screen.getByText('dashboard.admin.matches.manualEventHide')).toBeInTheDocument()
    // Select the create button by its unique text to avoid role/name ambiguity
    // with the MUI Select comboboxes in the form.
    expect(screen.getByText('dashboard.admin.matches.createEvent')).toBeInTheDocument()
  })

  it('calls onToggle when the toggle is clicked', () => {
    const onToggle = vi.fn()
    render(
      <ManualEventForm
        {...baseProps}
        show={false}
        onToggle={onToggle}
        handleCreateMatchEvent={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('dashboard.admin.matches.manualEventShow'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('calls handleCreateMatchEvent when the create button is clicked', () => {
    const handleCreateMatchEvent = vi.fn()
    render(
      <ManualEventForm
        {...baseProps}
        show={true}
        onToggle={vi.fn()}
        handleCreateMatchEvent={handleCreateMatchEvent}
      />
    )
    fireEvent.click(screen.getByText('dashboard.admin.matches.createEvent'))
    expect(handleCreateMatchEvent).toHaveBeenCalledTimes(1)
  })
})
