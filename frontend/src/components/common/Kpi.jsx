import { Box, Skeleton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

const SUB_TONE_COLORS = {
  positive: 'success.main',
  negative: 'error.main',
}

/**
 * Compact KPI tile: label, big tabular value, optional context line and an
 * optional sparkline/visual slot under it. Flat surface with a 1px border.
 * Props: label, value, sub?, subTone? ('positive' | 'negative'), sparkline?, loading?
 */
export default function Kpi({
  label,
  value,
  sub = '',
  subTone,
  sparkline = null,
  loading = false,
}) {
  const theme = useTheme()
  const tones = theme.custom?.tones || {}

  return (
    <Box
      sx={{
        minWidth: 0,
        p: 2,
        borderRadius: '12px',
        bgcolor: theme.custom?.surfaces?.card || 'background.paper',
        border: `1px solid ${theme.custom?.shell?.line || theme.palette.divider}`,
      }}
    >
      <Stack spacing={0.75}>
        <Typography
          component="div"
          sx={{ fontSize: '0.75rem', fontWeight: 600, color: tones.subtle || 'text.secondary' }}
        >
          {label}
        </Typography>
        {loading ? (
          <Skeleton variant="rounded" width="45%" height={28} />
        ) : (
          <Typography
            component="div"
            sx={{
              fontFamily: theme.typography.h1?.fontFamily,
              fontWeight: 700,
              fontSize: { xs: '1.35rem', md: '1.65rem' },
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
              overflowWrap: 'anywhere',
            }}
          >
            {value}
          </Typography>
        )}
        {sub ? (
          <Typography
            component="div"
            sx={{
              fontSize: '0.78rem',
              color: SUB_TONE_COLORS[subTone] || tones.subtle || 'text.secondary',
            }}
          >
            {sub}
          </Typography>
        ) : null}
        {sparkline ? <Box sx={{ pt: 0.5 }}>{sparkline}</Box> : null}
      </Stack>
    </Box>
  )
}
