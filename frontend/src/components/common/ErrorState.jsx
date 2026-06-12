import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { getSurfaceGeometry } from './surfaceGeometry.js'

/**
 * Copy-agnostic blocking error panel with an optional retry action.
 * Use for failed loads of a whole section; for inline form errors prefer <Alert>.
 *
 * Props: title, description?, onRetry?, retryLabel?, dense?
 */
export default function ErrorState({
  title = '',
  description = '',
  onRetry = null,
  retryLabel = 'Retry',
  dense = false,
}) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: geometry.surfaceRadius,
        border: `1px solid ${alpha(theme.palette.error.main, 0.32)}`,
        background: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.12 : 0.07),
        px: dense ? 2 : 3,
        py: dense ? 2.5 : 3.5,
      }}
    >
      <Stack spacing={1.25} alignItems="center" textAlign="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main' }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
            {description}
          </Typography>
        ) : null}
        {onRetry ? (
          <Box sx={{ pt: 0.5 }}>
            <Button variant="outlined" color="error" onClick={onRetry}>
              {retryLabel}
            </Button>
          </Box>
        ) : null}
      </Stack>
    </Paper>
  )
}
