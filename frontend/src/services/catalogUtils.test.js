import { describe, expect, it } from 'vitest'

import { pickDefaultNationality } from './catalogUtils.js'

describe('pickDefaultNationality (PL-13)', () => {
  it('defaults registration to Spain like the admin guest form, not the first entry', () => {
    expect(pickDefaultNationality(['Argentina', 'Brazil', 'Spain'])).toBe('Spain')
  })

  it('falls back to the first catalog entry when Spain is missing', () => {
    expect(pickDefaultNationality(['Argentina', 'Brazil'])).toBe('Argentina')
  })

  it('returns an empty value for an empty catalog', () => {
    expect(pickDefaultNationality([])).toBe('')
  })
})
