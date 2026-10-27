/** @vitest-environment happy-dom */
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ProfileImageField from './ProfileImageField.jsx'

describe('ProfileImageField', () => {
  it('U-11: shows an error next to the field when the file is not a valid image', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <ProfileImageField
        label="Profile photo"
        chooseLabel="Choose image"
        helperText="JPG, PNG or WebP"
        onChange={onChange}
        formatError={() => 'Use a JPG, PNG, or WebP image.'}
      />
    )

    const input = container.querySelector('input[type="file"]')
    const file = new File(['not an image'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Use a JPG, PNG, or WebP image.')
    expect(onChange).not.toHaveBeenCalled()
  })
})
