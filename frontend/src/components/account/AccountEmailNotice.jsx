import { Box, Button, IconButton, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { useI18n } from '../../i18n/useI18n.js'
import { EMAIL_NOTICE } from '../../services/accountEmailHelpers.js'
import {
  dismissEmailNotice,
  emailNoticeFingerprint,
  isEmailNoticeDismissed,
} from '../../services/emailNoticeDismissal.js'
import ShellIcon from '../dashboard/shell/ShellIcon.jsx'

/**
 * Non-blocking one-line notice under the dashboard topbar while the account has
 * no email or has not verified it (password recovery needs a verified email).
 * Dismissal is remembered per account (localStorage) until the email state
 * changes.
 */
export default function AccountEmailNotice({ accountEmail, onOpenSettings, userGuid = '' }) {
  const { t } = useI18n()
  const theme = useTheme()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}
  const { notice, saving, error, info } = accountEmail
  const fingerprint = emailNoticeFingerprint(notice, accountEmail.email)
  const [dismissedFingerprint, setDismissedFingerprint] = useState(null)

  if (
    !notice ||
    dismissedFingerprint === fingerprint ||
    isEmailNoticeDismissed(userGuid, fingerprint)
  ) {
    return null
  }

  const isMissing = notice === EMAIL_NOTICE.MISSING
  const actionSx = {
    minHeight: 28,
    py: 0,
    px: 0.75,
    fontWeight: 700,
    color: tones.accent,
    whiteSpace: 'nowrap',
  }

  const dismiss = () => {
    dismissEmailNotice(userGuid, fingerprint)
    setDismissedFingerprint(fingerprint)
  }

  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: { xs: 2, md: 3.5 },
        py: 0.5,
        minHeight: 38,
        fontSize: '0.8rem',
        color: tones.subtle,
        bgcolor: alpha(shell.sidebar || theme.palette.background.default, 0.6),
        borderBottom: `1px solid ${shell.line}`,
      }}
    >
      <ShellIcon name="bell" size={15} />
      <Typography
        component="span"
        sx={{ fontSize: 'inherit', minWidth: 0, flexShrink: 1, overflowWrap: 'anywhere' }}
      >
        {error || info || (isMissing ? t('shell.emailNotice.missing') : null)}
        {!error && !info && !isMissing ? (
          <>
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {t('shell.emailNotice.unverified', { email: accountEmail.email })}
            </Box>
            {/* Phones: the short copy keeps the notice to two lines. */}
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              {t('shell.emailNotice.unverifiedShort')}
            </Box>
          </>
        ) : null}
      </Typography>
      {!isMissing ? (
        <Button
          size="small"
          disabled={saving}
          onClick={() => accountEmail.resendVerification()}
          aria-label={t('accountEmail.resend')}
          sx={actionSx}
        >
          {t('shell.emailNotice.resend')}
        </Button>
      ) : null}
      <Button
        size="small"
        onClick={onOpenSettings}
        sx={{
          ...actionSx,
          // Phones keep one action; "Change email" stays reachable in settings.
          display: isMissing ? 'inline-flex' : { xs: 'none', sm: 'inline-flex' },
        }}
      >
        {isMissing ? t('accountEmail.addAction') : t('accountEmail.changeAction')}
      </Button>
      <Box sx={{ flex: 1 }} />
      <IconButton
        size="small"
        aria-label={t('shell.emailNotice.dismiss')}
        onClick={dismiss}
        sx={{ color: tones.muted, flex: 'none' }}
      >
        <ShellIcon name="close" size={15} />
      </IconButton>
    </Box>
  )
}
