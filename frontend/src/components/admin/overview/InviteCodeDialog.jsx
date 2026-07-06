import { useState } from 'react'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

/**
 * Modal shown when an invite code is generated. Replaces the old inline invite
 * card: invite is now a Quick Action that generates the code and pops this dialog
 * with the code + its expiry.
 */
export default function InviteCodeDialog({ open, payload, onClose, t, formatEpochSeconds }) {
  const theme = useTheme()
  const [copied, setCopied] = useState(false)
  const code = payload?.token || ''

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      onTransitionExited={() => setCopied(false)}
    >
      <DialogTitle>{t('dashboard.admin.overview.inviteTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.overview.inviteDescription')}
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: theme.custom?.dashboard?.radius?.surface || '14px',
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
              bgcolor: alpha(theme.palette.secondary.main, 0.08),
              textAlign: 'center',
            }}
          >
            <Typography variant="overline" color="text.secondary">
              {t('dashboard.admin.overview.codeLabel')}
            </Typography>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontWeight: 800,
                fontSize: '1.6rem',
                letterSpacing: 2,
                color: 'secondary.main',
                overflowWrap: 'anywhere',
              }}
            >
              {code}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            <strong>{t('dashboard.admin.overview.expiresLabel')}:</strong>{' '}
            {payload?.expires_at ? formatEpochSeconds(payload.expires_at) : '-'}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCopy} color="secondary" variant="contained" disabled={!code}>
          {copied
            ? t('dashboard.admin.overview.inviteCopied')
            : t('dashboard.admin.overview.inviteCopy')}
        </Button>
        <Button onClick={onClose}>{t('dashboard.admin.overview.inviteClose')}</Button>
      </DialogActions>
    </Dialog>
  )
}
