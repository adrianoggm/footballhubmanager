/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { ThemeProvider } from '@mui/material/styles'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import NewTransactionCard from './NewTransactionCard.jsx'
import { createAppTheme } from '../../../theme.js'

const theme = createAppTheme()

const P = 'dashboard.admin.accountability'
const t = (key) => key

const renderCard = (props = {}) => {
  const onRecord = vi.fn(async () => true)
  const onInvalid = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <NewTransactionCard
        t={t}
        currency="EUR"
        locale="es-ES"
        playerOptions={[]}
        categoryPresets={[]}
        onRecord={onRecord}
        onInvalid={onInvalid}
        submitting={false}
        {...props}
      />
    </ThemeProvider>
  )
  return { onRecord, onInvalid }
}

const amountInput = () => screen.getByLabelText(`${P}.amount`)
const conceptInput = () => screen.getByLabelText(`${P}.concept`)
const submit = () => fireEvent.click(screen.getByText(`${P}.recordTransaction`))

describe('NewTransactionCard', () => {
  it('does not record an empty amount as 0 and explains why (MO-03, MO-06)', () => {
    const { onRecord, onInvalid } = renderCard()
    fireEvent.change(conceptInput(), { target: { value: 'Cuota' } })
    submit()

    expect(onRecord).not.toHaveBeenCalled()
    expect(onInvalid).toHaveBeenCalled()
    expect(screen.getByText(`${P}.validation.amountRequired`)).toBeInTheDocument()
  })

  it('rejects a zero amount (MO-03)', () => {
    const { onRecord } = renderCard()
    fireEvent.change(amountInput(), { target: { value: '0' } })
    fireEvent.change(conceptInput(), { target: { value: 'Cuota' } })
    submit()

    expect(onRecord).not.toHaveBeenCalled()
    expect(screen.getByText(`${P}.validation.amountPositive`)).toBeInTheDocument()
  })

  it('rejects absurd amounts before calling the API (MO-04)', () => {
    const { onRecord } = renderCard()
    fireEvent.change(amountInput(), { target: { value: '99999999999999999' } })
    fireEvent.change(conceptInput(), { target: { value: 'Cuota' } })
    submit()

    expect(onRecord).not.toHaveBeenCalled()
    expect(screen.getByText(`${P}.validation.amountTooLarge`)).toBeInTheDocument()
  })

  it('flags a missing concept inline (MO-06)', () => {
    const { onRecord } = renderCard()
    fireEvent.change(amountInput(), { target: { value: '10' } })
    submit()

    expect(onRecord).not.toHaveBeenCalled()
    expect(screen.getByText(`${P}.validation.conceptRequired`)).toBeInTheDocument()
  })

  it('records a valid movement', () => {
    const { onRecord, onInvalid } = renderCard()
    fireEvent.change(amountInput(), { target: { value: '12.5' } })
    fireEvent.change(conceptInput(), { target: { value: ' Cuota ' } })
    submit()

    expect(onInvalid).not.toHaveBeenCalled()
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'income', amount_cents: 1250, concept: 'Cuota' })
    )
  })

  it('limits the concept to the column length (MO-07)', () => {
    renderCard()
    expect(conceptInput()).toHaveAttribute('maxlength', '160')
  })

  it('shows the currency symbol, not the ISO code (MO-16)', () => {
    renderCard()
    expect(screen.getByText('€')).toBeInTheDocument()
    expect(screen.queryByText('EUR')).not.toBeInTheDocument()
  })
})
