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

// Admin palette (issue #147) comes from theme.custom.surfaces/tones so the
// Player Directory follows the active preset (Ember keeps the warm look, #70).

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
  const { surfaces, tones } = theme.custom
  const surface = surfaces.raised
  const textColor = tones.onRaised
  const muted = tones.muted
  const accent = tones.accentStrong
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
    backgroundColor: accent,
    color: theme.palette.background.paper,
    boxShadow: 'none',
    '&:hover': {
      backgroundImage: 'none',
      backgroundColor: tones.accentHover,
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
        sx: { backgroundColor: surface, color: textColor, borderRadius: geometry.surfaceRadius },
      }}
    >
      <DialogTitle sx={{ color: textColor }}>
        {t('dashboard.admin.members.claimLinkTitle')}
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(textColor, 0.12) }}>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: muted }}>
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
            <Typography variant="body2" sx={{ color: muted }}>
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
        <Button onClick={onClose} sx={{ color: textColor }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button variant="contained" onClick={handleCopy} disabled={!claimUrl} sx={accentButtonSx}>
          {t('dashboard.admin.members.claimLinkCopy')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
