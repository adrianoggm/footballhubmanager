/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ThemeModeProvider } from '../../../theme/ThemeModeProvider.jsx'
import QuickActions from './QuickActions.jsx'

const t = (key) => key.split('.').pop()
const actions = {
  onGenerateJoinCode: vi.fn(),
  onAddPlayer: vi.fn(),
  onAddGuest: vi.fn(),
  onAddFunds: vi.fn(),
  onAddExpenses: vi.fn(),
  onStandings: vi.fn(),
}

describe('QuickActions (F2)', () => {
  it('names each tile by its title, without the icon ligature', () => {
    render(
      <ThemeModeProvider>
        <QuickActions actions={actions} t={t} />
      </ThemeModeProvider>
    )

    expect(screen.getByRole('button', { name: /^qaInviteTitle/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^qaAddPlayerTitle/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /group_add|person_add/ })).toBeNull()
  })
})
