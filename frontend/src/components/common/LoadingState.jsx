import { Box, LinearProgress, Skeleton, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { getSurfaceGeometry } from './surfaceGeometry.js'

/**
 * Shared loading placeholder. Replaces scattered bare <LinearProgress /> usages.
 *
 * Props:
 *  - variant: 'linear' (default) | 'skeleton'
 *  - label?: caption shown under a linear bar
 *  - rows?: number of skeleton rows (variant 'skeleton', default 3)
 */
export default function LoadingState({ variant = 'linear', label = '', rows = 3 }) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)

  if (variant === 'skeleton') {
    return (
      <Box
        sx={{
          borderRadius: geometry.surfaceRadius,
          border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
          p: 2,
        }}
      >
        <Stack spacing={1.1}>
          {Array.from({ length: Math.max(1, rows) }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              height={index === 0 ? 28 : 18}
              width={index === 0 ? '40%' : '100%'}
            />
          ))}
        </Stack>
      </Box>
    )
  }

  return (
    <Stack spacing={1} sx={{ py: 1.5 }} aria-busy="true">
      <LinearProgress />
      {label ? (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {label}
        </Typography>
      ) : null}
    </Stack>
  )
}
