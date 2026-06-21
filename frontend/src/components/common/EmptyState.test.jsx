/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import EmptyState from './EmptyState.jsx'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No matches" description="Nothing scheduled yet" />)
    expect(screen.getByText('No matches')).toBeInTheDocument()
    expect(screen.getByText('Nothing scheduled yet')).toBeInTheDocument()
  })

  it('renders the action node when provided', () => {
    render(<EmptyState title="No season" action={<button>Create season</button>} />)
    expect(screen.getByRole('button', { name: 'Create season' })).toBeInTheDocument()
  })
})
