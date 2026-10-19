import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useEffect, useState } from 'react'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'

// Warm accountability palette (issue #147) — shared with StatCard / PlayerToolbar
// / PlayerList so the Player Directory dialogs read as the same system rather
// than inventing a new visual language.
const SURFACE = '#45342C'
const TEXT_COLOR = '#F4EEE8'
const MUTED = '#88736A'
const ACCENT = '#FCB491'

// Local equivalent of matches/lineupHelpers.js#formatPlayerDisplayName — the
// dialog contract (issue #147, task 7) does not thread that helper down here,
// so the personalized claim description is built from the raw player fields.
function formatClaimPlayerName(player) {
  if (!player) {
    return ''
  }
  const fullName = [player.name, player.surname1, player.surname2].filter(Boolean).join(' ')
  if (player.nickname && fullName) {
    return `${player.nickname} (${fullName})`
  }
  return player.nickname || fullName || ''
}

/**
 * Controlled dialog showing the generated `/claim/{token}` invite link
 * previously inline in AdminPlayersSection (issue #147, task 7). Purely
 * presentational: the caller decides when it is open (`Boolean(claimLinkPayload)`
 * at the call site) and supplies the already-generated payload.
 */
export default function ClaimLinkDialog({
  open,
  onClose,
  claimLinkPayload,
  formatEpochSeconds,
  t,
}) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [claimLinkPayload])

  const claimUrl = claimLinkPayload?.token
    ? `${window.location.origin}/claim/${claimLinkPayload.token}`
    : ''

  const handleCopy = async () => {
    if (!claimUrl) {
      return
    }
    try {
      await navigator.clipboard.writeText(claimUrl)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const accentButtonSx = {
    backgroundImage: 'none',
    backgroundColor: ACCENT,
    color: theme.palette.background.paper,
    boxShadow: 'none',
    '&:hover': {
      backgroundImage: 'none',
      backgroundColor: '#f2a074',
      boxShadow: theme.custom?.shadows?.md,
    },
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { backgroundColor: SURFACE, color: TEXT_COLOR, borderRadius: geometry.surfaceRadius },
      }}
    >
      <DialogTitle sx={{ color: TEXT_COLOR }}>
        {t('dashboard.admin.members.claimLinkTitle')}
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(TEXT_COLOR, 0.12) }}>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: MUTED }}>
            {claimLinkPayload?.player
              ? t('dashboard.admin.members.claimLinkDescription', {
                  player: formatClaimPlayerName(claimLinkPayload.player),
                })
              : t('dashboard.admin.members.claimLinkDescriptionGeneric')}
          </Typography>
          <TextField
            label={t('dashboard.admin.members.claimLinkUrlLabel')}
            value={claimUrl}
            InputProps={{ readOnly: true }}
            fullWidth
            multiline
          />
          {claimLinkPayload?.expires_at && (
            <Typography variant="body2" sx={{ color: MUTED }}>
              <strong>{t('dashboard.admin.overview.expiresLabel')}:</strong>{' '}
              {formatEpochSeconds(claimLinkPayload.expires_at)}
            </Typography>
          )}
          {copied && (
            <Typography variant="body2" color="success.main">
              {t('dashboard.admin.members.claimLinkCopied')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: TEXT_COLOR }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button variant="contained" onClick={handleCopy} disabled={!claimUrl} sx={accentButtonSx}>
          {t('dashboard.admin.members.claimLinkCopy')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
