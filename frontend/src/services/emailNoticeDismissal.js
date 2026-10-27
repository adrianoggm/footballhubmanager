// Remembers, per account, that the dashboard email notice was dismissed. The
// stored value is tied to the notice state ("unverified:me@x.com"), so the
// notice comes back when that state changes (e.g. a new address is added).

const storageKey = (userGuid) => `fhm:email-notice-dismissed:${userGuid || 'anonymous'}`

export const emailNoticeFingerprint = (notice, email = '') => `${notice || ''}:${email || ''}`

export const isEmailNoticeDismissed = (userGuid, fingerprint) => {
  try {
    return window.localStorage.getItem(storageKey(userGuid)) === fingerprint
  } catch {
    return false
  }
}

export const dismissEmailNotice = (userGuid, fingerprint) => {
  try {
    window.localStorage.setItem(storageKey(userGuid), fingerprint)
  } catch {
    // Storage unavailable: the dismissal only lasts for this view.
  }
}
