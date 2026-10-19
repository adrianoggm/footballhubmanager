import { Box, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

/**
 * Ascuas KPI card: label + big value + optional sub/trend line + a muted
 * corner icon. Mirrors the Overview datacard look (issue #144) so the migrated
 * Accountability view reads as the same system.
 */
export default function StatCard({
  label,
  value,
  sub,
  subTone = 'neutral',
  icon,
  accent,
  onClick,
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const radius = theme.custom?.dashboard?.radius?.surface || '14px'
  const accentColor = accent || theme.palette.secondary.main

  const toneColor =
    subTone === 'positive'
      ? theme.palette.success.main
      : subTone === 'negative'
        ? theme.palette.error.main
        : '#88736A'

  const interactive = typeof onClick === 'function'

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      {...(interactive
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick()
              }
            },
          }
        : {})}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 118,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        borderRadius: radius,
        border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.05 : 0.07)}`,
        backgroundColor: '#45342C',
        px: '24px',
        py: '18px',
        ...(interactive
          ? {
              cursor: 'pointer',
              transition: 'transform 150ms ease, border-color 150ms ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: alpha(accentColor, 0.6),
              },
              '&.Mui-focusVisible, &:focus-visible': {
                outline: `2px solid ${alpha(accentColor, 0.9)}`,
                outlineOffset: 2,
              },
            }
          : {}),
      }}
    >
      {icon ? (
        <Box
          component="span"
          className="material-symbols-rounded"
          sx={{
            position: 'absolute',
            right: 16,
            bottom: 12,
            fontSize: 44,
            color: alpha(accentColor, 0.5),
            pointerEvents: 'none',
            fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 40",
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Stack spacing="6px" sx={{ position: 'relative', zIndex: 1, pr: 4, width: '100%' }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.82rem',
            lineHeight: 1.25,
            color: '#88736A',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Hanken Grotesk", sans-serif',
            fontWeight: 800,
            color: '#F4EEE8',
            lineHeight: 1.02,
            fontSize: '2.1rem',
            letterSpacing: -0.5,
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Typography>
        {sub ? (
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 600,
              fontSize: '0.72rem',
              letterSpacing: '0.02em',
              color: toneColor,
            }}
          >
            {sub}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  )
}
