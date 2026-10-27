import { Alert, Button, Stack, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
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
  // U-10: on phones the action buttons would squeeze the message into a sliver;
  // there they stack under the full-width text instead of sitting beside it.
  const theme = useTheme()
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'))
  const { notice, saving, error, info } = accountEmail

  if (!notice || dismissed) {
    return null
  }

  const isMissing = notice === EMAIL_NOTICE.MISSING

  const actions = (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
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
  )

  return (
    <Alert
      severity={isMissing ? 'warning' : 'info'}
      onClose={() => setDismissed(true)}
      action={isPhone ? undefined : actions}
      sx={{ '& .MuiAlert-message': { flex: 1, minWidth: 0, overflowWrap: 'break-word' } }}
    >
      {isMissing
        ? t('accountEmail.noticeMissing')
        : t('accountEmail.noticeUnverified', { email: accountEmail.email })}
      {(error || info) && <div>{error || info}</div>}
      {isPhone && <Stack sx={{ mt: 1 }}>{actions}</Stack>}
    </Alert>
  )
}
