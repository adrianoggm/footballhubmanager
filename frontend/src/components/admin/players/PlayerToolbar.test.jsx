/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { messages } from '../../../i18n/messages.js'
import { ThemeModeProvider } from '../../../theme/ThemeModeProvider.jsx'
import PlayerToolbar from './PlayerToolbar.jsx'

const t = (key) => key.split('.').reduce((node, part) => node?.[part], messages.es) ?? key

describe('PlayerToolbar filters (PL-10)', () => {
  it('shows translated role/position labels instead of the raw keys', () => {
    render(
      <ThemeModeProvider>
        <PlayerToolbar
          toolbar={{
            search: '',
            roleFilter: [],
            positionFilter: [],
            statusFilter: 'all',
            sort: 'name_asc',
            page: 1,
          }}
          actions={{
            setSearch: vi.fn(),
            setRoleFilter: vi.fn(),
            setPositionFilter: vi.fn(),
            setStatusFilter: vi.fn(),
            setSort: vi.fn(),
            setPage: vi.fn(),
          }}
          roleOptions={['president', 'Capitán']}
          positionOptions={['attacker', 'defender']}
          t={t}
        />
      </ThemeModeProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /Filtros/i }))

    expect(screen.getByLabelText('Presidente')).toBeInTheDocument()
    expect(screen.getByLabelText('Delantero')).toBeInTheDocument()
    expect(screen.getByLabelText('Defensa')).toBeInTheDocument()
    // Custom pena labels are shown as-is.
    expect(screen.getByLabelText('Capitán')).toBeInTheDocument()
    expect(screen.queryByLabelText('president')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('attacker')).not.toBeInTheDocument()
  })
})
