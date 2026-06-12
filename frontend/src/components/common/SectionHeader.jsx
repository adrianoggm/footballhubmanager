import { Box, Stack, Typography } from '@mui/material'

/**
 * Consistent header for a dashboard section: title block on the left, actions on
 * the right (primary CTA + optional overflow). Wraps gracefully on small screens.
 *
 * Props:
 *  - title, subtitle?
 *  - contextChip?: node rendered next to the title (e.g. a season/peña chip)
 *  - primaryAction?: node (the main CTA button)
 *  - secondary?: node (overflow menu / lower-emphasis actions)
 */
export default function SectionHeader({
  title = '',
  subtitle = '',
  contextChip = null,
  primaryAction = null,
  secondary = null,
}) {
  const hasActions = Boolean(primaryAction || secondary)

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.25}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      sx={{ width: '100%' }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="h6" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
            {title}
          </Typography>
          {contextChip}
        </Stack>
        {subtitle ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>

      {hasActions ? (
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
        >
          {secondary}
          {primaryAction}
        </Stack>
      ) : null}
    </Stack>
  )
}
