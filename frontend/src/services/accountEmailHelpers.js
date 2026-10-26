// Pure helpers for the account email / password recovery UI (#154).

export const MIN_PASSWORD_LENGTH = 12

export const EMAIL_NOTICE = {
  MISSING: 'missing',
  UNVERIFIED: 'unverified',
}

// Mirrors the backend EmailAddress value object: one "@", a dotted domain, no spaces.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const normalizeEmail = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()

export const isValidEmail = (value) => {
  const email = normalizeEmail(value)
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

/** Which non-blocking notice the dashboards should show, or null for none. */
export const resolveEmailNotice = (status) => {
  if (!status) {
    return null
  }
  if (!status.email) {
    return EMAIL_NOTICE.MISSING
  }
  if (!status.email_verified) {
    return EMAIL_NOTICE.UNVERIFIED
  }
  return null
}

/** i18n key for an account-email request error (change / resend). */
export const accountEmailErrorKey = (error) => {
  switch (error?.status) {
    case 400:
    case 422:
      return 'accountEmail.errors.invalidEmail'
    case 409:
      return String(error?.message || '')
        .toLowerCase()
        .includes('already in use')
        ? 'accountEmail.errors.emailInUse'
        : 'accountEmail.errors.conflict'
    case 429:
      return 'accountEmail.errors.cooldown'
    case 503:
      return 'accountEmail.errors.delivery'
    default:
      return 'accountEmail.errors.generic'
  }
}

/** i18n key for an emailed-token error (verify email / reset password). */
export const tokenErrorKey = (error) => {
  if (error?.status === 410) {
    return 'passwordRecovery.errors.expiredToken'
  }
  if (error?.status === 400 || error?.status === 422) {
    return 'passwordRecovery.errors.invalidToken'
  }
  return 'passwordRecovery.errors.generic'
}
