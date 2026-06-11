import { Box, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { getSurfaceGeometry } from './surfaceGeometry.js'

/**
 * Copy-agnostic empty / zero-data placeholder. The caller passes already
 * translated strings and (optionally) an action node (e.g. a Button) and an icon.
 *
 * Props: icon?, title, description?, action?, dense?
 */
export default function EmptyState({
  icon = null,
  title = '',
  description = '',
  action = null,
  dense = false,
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getSurfaceGeometry(theme)

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: geometry.surfaceRadius,
        border: `1px dashed ${alpha(theme.palette.text.primary, isDark ? 0.18 : 0.14)}`,
        background: alpha(theme.palette.background.paper, isDark ? 0.4 : 0.55),
        px: dense ? 2 : 3,
        py: dense ? 2.5 : 4,
      }}
    >
      <Stack spacing={1.25} alignItems="center" textAlign="center">
        {icon ? (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: geometry.controlRadius,
              display: 'grid',
              placeItems: 'center',
              color: 'text.secondary',
              bgcolor: alpha(theme.palette.text.primary, isDark ? 0.08 : 0.05),
            }}
          >
            {icon}
          </Box>
        ) : null}
        {title ? (
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
        ) : null}
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
            {description}
          </Typography>
        ) : null}
        {action ? <Box sx={{ pt: 0.5 }}>{action}</Box> : null}
      </Stack>
    </Paper>
  )
}
