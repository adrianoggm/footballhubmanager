import { Box, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { getSurfaceGeometry } from './surfaceGeometry.js'

const toneToPaletteKey = {
  primary: 'primary',
  secondary: 'secondary',
  success: 'success',
  warning: 'warning',
  info: 'info',
  error: 'error',
}

/**
 * Canonical KPI card. A theme-driven, copy-agnostic stat tile used across
 * dashboards. `tone` selects a palette accent; `icon` is optional.
 *
 * Props: label, value, helper?, tone? ('primary'|'secondary'|'success'|'warning'|'info'|'error'), icon?
 */
export default function StatCard({
  label = '',
  value = '',
  helper = '',
  tone = 'primary',
  icon = null,
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getSurfaceGeometry(theme)
  const paletteKey = toneToPaletteKey[tone] || 'primary'
  const accent = theme.palette[paletteKey].main
  const valueText = String(value ?? '').trim() || '-'

  return (
    <Paper
      elevation={0}
      sx={{
        minHeight: '100%',
        borderRadius: geometry.surfaceRadius,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(
          theme.palette.background.default,
          isDark ? 0.72 : 0.7
        )} 100%)`,
        boxShadow: geometry.cardShadow,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(145deg, ${alpha(accent, 0.06)} 0%, transparent 42%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Box sx={{ position: 'relative', zIndex: 1, px: 1.5, py: 1.25 }}>
        <Stack spacing={0.65} sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 0.5, lineHeight: 1.05, maxWidth: '78%' }}
            >
              {label}
            </Typography>
            {icon ? (
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  borderRadius: geometry.badgeRadius,
                  display: 'grid',
                  placeItems: 'center',
                  color: accent,
                  bgcolor: alpha(accent, 0.1),
                  border: `1px solid ${alpha(accent, 0.14)}`,
                }}
              >
                {icon}
              </Box>
            ) : null}
          </Stack>

          <Typography
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.08,
              fontSize: '1.34rem',
              letterSpacing: -0.2,
              overflowWrap: 'anywhere',
            }}
          >
            {valueText}
          </Typography>

          {helper ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.76rem', lineHeight: 1.25 }}
            >
              {helper}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Paper>
  )
}
