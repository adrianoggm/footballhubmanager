import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { accountEmailErrorKey, resolveEmailNotice } from '../services/accountEmailHelpers.js'
import { authService } from '../services/authService.js'

/**
 * Email + verification status of the signed-in account, shared by the dashboard
 * notice and the settings dialog (call once per dashboard and pass it down so both
 * stay in sync after a change).
 */
export function useAccountEmail() {
  const { language, t } = useI18n()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setStatus(await authService.getAccountEmail())
    } catch {
      // Non-blocking feature: without a status the notice simply stays hidden.
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const run = async (request, successKey) => {
    setSaving(true)
    setError('')
    setInfo('')
    try {
      const result = await request()
      setInfo(t(successKey))
      return result
    } catch (requestError) {
      setError(t(accountEmailErrorKey(requestError)))
      return null
    } finally {
      setSaving(false)
    }
  }

  const changeEmail = async (email) => {
    const result = await run(
      () => authService.changeAccountEmail({ email, lang: language }),
      'accountEmail.changed'
    )
    if (result) {
      setStatus(result)
    }
    return Boolean(result)
  }

  const resendVerification = () =>
    run(() => authService.resendEmailVerification({ lang: language }), 'accountEmail.resent')

  return {
    status,
    email: status?.email || '',
    verified: Boolean(status?.email_verified),
    notice: resolveEmailNotice(status),
    loading,
    saving,
    error,
    info,
    refresh,
    changeEmail,
    resendVerification,
  }
}
