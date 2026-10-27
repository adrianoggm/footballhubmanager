/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import HeaderIconButton from './HeaderIconButton.jsx'

describe('HeaderIconButton (F2)', () => {
  it('names the button with its label, not the icon ligature', async () => {
    const onClick = vi.fn()
    render(<HeaderIconButton icon="logout" label="Cerrar sesión" onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Cerrar sesión' })
    await userEvent.setup().click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('hides the decorative icon from assistive technology', () => {
    render(<HeaderIconButton icon="refresh" label="Refrescar datos" onClick={() => {}} />)

    expect(screen.getByText('refresh')).toHaveAttribute('aria-hidden', 'true')
  })

  it('keeps its accessible name while disabled', () => {
    render(<HeaderIconButton icon="settings" label="Configurar peña" onClick={() => {}} disabled />)

    expect(screen.getByRole('button', { name: 'Configurar peña' })).toBeDisabled()
  })
})
