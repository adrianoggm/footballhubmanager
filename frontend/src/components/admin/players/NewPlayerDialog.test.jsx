/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { messages } from '../../../i18n/messages.js'
import { ThemeModeProvider } from '../../../theme/ThemeModeProvider.jsx'
import NewPlayerDialog from './NewPlayerDialog.jsx'

const t = (key, params = {}) => {
  const value = key.split('.').reduce((node, part) => node?.[part], messages.es)
  if (typeof value !== 'string') return key
  return value.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`))
}

const emptyForm = {
  name: '',
  surname1: '',
  surname2: '',
  nationality: 'Spain',
  nickname: '',
  role: 'guest',
  position: '',
}

const renderDialog = (props = {}) => {
  const onCreate = vi.fn()
  render(
    <ThemeModeProvider>
      <NewPlayerDialog
        open
        onClose={vi.fn()}
        guestForm={emptyForm}
        onGuestField={() => vi.fn()}
        nationalities={['Spain']}
        roleOptions={['president', 'member', 'guest']}
        positionOptions={['keeper']}
        onCreate={onCreate}
        t={t}
        {...props}
      />
    </ThemeModeProvider>
  )
  return { onCreate }
}

describe('NewPlayerDialog', () => {
  it('is titled "Nuevo jugador", not "Jugadores invitados" (PL-12)', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toHaveTextContent('Nuevo jugador')
    expect(screen.queryByText('Jugadores invitados')).not.toBeInTheDocument()
  })

  it('shows field-level required errors and does not submit an empty guest (PL-11)', () => {
    const { onCreate } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Crear invitado' }))

    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getAllByText('Este campo es obligatorio')).toHaveLength(2)
  })

  it('submits once name and first surname are filled in', () => {
    const { onCreate } = renderDialog({
      guestForm: { ...emptyForm, name: 'Ana', surname1: 'Ruiz' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear invitado' }))
    expect(onCreate).toHaveBeenCalledWith(false)
  })

  it('offers no "Sin rol" option: a membership always has a role (PL-04)', () => {
    renderDialog()
    fireEvent.mouseDown(screen.getAllByRole('combobox')[1])
    const listbox = screen.getByRole('listbox')
    expect(within(listbox).queryByText('Sin rol')).not.toBeInTheDocument()
    expect(within(listbox).getAllByRole('option')).toHaveLength(3)
  })

  it('warns about a duplicate and requires an explicit confirmation (PL-06)', () => {
    const { onCreate } = renderDialog({
      guestForm: { ...emptyForm, name: 'Ana', surname1: 'Ruiz' },
      duplicateNames: ['Ana Ruiz'],
    })
    expect(screen.getByText(/Ya existe un jugador con el mismo nombre: Ana Ruiz/)).toBeVisible()
    const create = screen.getByRole('button', { name: 'Crear invitado' })
    expect(create).toBeDisabled()

    fireEvent.click(screen.getByLabelText('Crearlo de todos modos'))
    fireEvent.click(create)
    expect(onCreate).toHaveBeenCalledWith(false)
  })
})
