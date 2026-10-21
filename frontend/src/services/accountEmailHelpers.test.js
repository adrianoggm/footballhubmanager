import { describe, expect, it } from 'vitest'
import {
  EMAIL_NOTICE,
  accountEmailErrorKey,
  isValidEmail,
  normalizeEmail,
  resolveEmailNotice,
  tokenErrorKey,
} from './accountEmailHelpers.js'

describe('normalizeEmail / isValidEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com')
    expect(normalizeEmail(null)).toBe('')
  })

  it('accepts plausible addresses and rejects malformed ones', () => {
    expect(isValidEmail(' ana@example.com ')).toBe(true)
    for (const raw of ['', 'ana', 'ana@', '@example.com', 'ana@example', 'a b@example.com']) {
      expect(isValidEmail(raw)).toBe(false)
    }
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false)
  })
})

describe('resolveEmailNotice', () => {
  it('flags a missing email', () => {
    expect(resolveEmailNotice({ email: null, email_verified: false })).toBe(EMAIL_NOTICE.MISSING)
  })

  it('flags an unverified email', () => {
    expect(resolveEmailNotice({ email: 'a@b.co', email_verified: false })).toBe(
      EMAIL_NOTICE.UNVERIFIED
    )
  })

  it('shows nothing when verified or status unknown', () => {
    expect(resolveEmailNotice({ email: 'a@b.co', email_verified: true })).toBeNull()
    expect(resolveEmailNotice(null)).toBeNull()
  })
})

describe('error keys', () => {
  it('maps account email errors by status', () => {
    expect(accountEmailErrorKey({ status: 400 })).toBe('accountEmail.errors.invalidEmail')
    expect(accountEmailErrorKey({ status: 409, message: 'Email already in use' })).toBe(
      'accountEmail.errors.emailInUse'
    )
    expect(accountEmailErrorKey({ status: 409, message: 'Email is already verified' })).toBe(
      'accountEmail.errors.conflict'
    )
    expect(accountEmailErrorKey({ status: 429 })).toBe('accountEmail.errors.cooldown')
    expect(accountEmailErrorKey({ status: 503 })).toBe('accountEmail.errors.delivery')
    expect(accountEmailErrorKey(new Error('boom'))).toBe('accountEmail.errors.generic')
  })

  it('maps token errors by status', () => {
    expect(tokenErrorKey({ status: 410 })).toBe('passwordRecovery.errors.expiredToken')
    expect(tokenErrorKey({ status: 400 })).toBe('passwordRecovery.errors.invalidToken')
    expect(tokenErrorKey({ status: 500 })).toBe('passwordRecovery.errors.generic')
  })
})
