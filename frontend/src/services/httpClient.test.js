import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpClient, errorMessageFromPayload } from './httpClient.js'

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'Unprocessable Entity',
  headers: { get: () => 'application/json' },
  text: async () => JSON.stringify(body),
})

describe('httpClient errors (MO-07)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('turns a FastAPI 422 detail array into a readable message', async () => {
    const detail = [
      {
        type: 'date_from_datetime_parsing',
        loc: ['body', 'occurred_on'],
        msg: 'Input should be a valid date',
        input: '',
      },
      { type: 'missing', loc: ['body', 'concept'], msg: 'Field required' },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(422, { detail }))
    )

    const error = await new HttpClient('').post('/x', {}).catch((caught) => caught)

    expect(error).toBeInstanceOf(Error)
    expect(error.message).not.toContain('[object Object]')
    expect(error.message).toBe('occurred_on: Input should be a valid date; concept: Field required')
    expect(error.status).toBe(422)
    expect(error.payload).toEqual({ detail })
  })

  it('keeps plain string details as they are', () => {
    expect(errorMessageFromPayload({ detail: 'Amount out of range' }, 'x')).toBe(
      'Amount out of range'
    )
    expect(errorMessageFromPayload('boom', 'x')).toBe('boom')
    expect(errorMessageFromPayload({ message: 'm' }, 'x')).toBe('m')
    expect(errorMessageFromPayload(null, 'fallback')).toBe('fallback')
    expect(errorMessageFromPayload({ detail: { msg: 'single' } }, 'x')).toBe('single')
  })
})
