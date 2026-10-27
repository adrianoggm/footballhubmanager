import { Alert, Button, Stack } from '@mui/material'
import { useState } from 'react'
import { useI18n } from '../../i18n/useI18n.js'
import { EMAIL_NOTICE } from '../../services/accountEmailHelpers.js'

/**
 * Non-blocking dashboard notice shown while the account has no email or has not
 * verified it (password recovery needs a verified email). Dismissible for the
 * current view only; it comes back on the next load until the email is verified.
 */
export default function AccountEmailNotice({ accountEmail, onOpenSettings }) {
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(false)
  const { notice, saving, error, info } = accountEmail

  if (!notice || dismissed) {
    return null
  }

  const isMissing = notice === EMAIL_NOTICE.MISSING

  return (
    <Alert
      severity={isMissing ? 'warning' : 'info'}
      onClose={() => setDismissed(true)}
      action={
        <Stack direction="row" spacing={1} alignItems="center">
          {!isMissing && (
            <Button
              color="inherit"
              size="small"
              disabled={saving}
              onClick={() => accountEmail.resendVerification()}
            >
              {t('accountEmail.resend')}
            </Button>
          )}
          <Button color="inherit" size="small" onClick={onOpenSettings}>
            {isMissing ? t('accountEmail.addAction') : t('accountEmail.changeAction')}
          </Button>
        </Stack>
      }
    >
      {isMissing
        ? t('accountEmail.noticeMissing')
        : t('accountEmail.noticeUnverified', { email: accountEmail.email })}
      {(error || info) && <div>{error || info}</div>}
    </Alert>
  )
}
