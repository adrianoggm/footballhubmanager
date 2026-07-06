import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

// Material Symbols (Rounded) ligature names per datacard.
const ICONS = {
  players: 'groups',
  matches: 'sports_soccer',
  goals: 'sports_score', // checkered flag
  scorer: 'star',
}

function OverviewStatCard({ item }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const radius = theme.custom?.dashboard?.radius?.surface || '14px'
  const value = String(item.value ?? '').trim() || '-'
  // Only short numeric values get the big size; names/text get a compact size.
  const numeric = /^[\d.,%+\s-]+$/.test(value)
  const iconName = ICONS[item.icon] || ICONS.players

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 108,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        borderRadius: radius,
        border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.05 : 0.07)}`,
        backgroundColor: '#332923',
        px: '24px',
        py: '16px',
      }}
    >
      {/* subtle Material Symbols corner icon, bottom-right */}
      <Box
        component="span"
        className="material-symbols-rounded"
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 12,
          fontSize: 40,
          color: alpha(theme.palette.text.primary, isDark ? 0.26 : 0.32),
          pointerEvents: 'none',
          fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 40",
        }}
      >
        {iconName}
      </Box>

      <Stack spacing="8px" sx={{ position: 'relative', zIndex: 1, pr: 4, width: '100%' }}>
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.9rem',
            lineHeight: 1.25,
            color: '#88736A',
          }}
        >
          {item.label}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Hanken Grotesk", sans-serif',
            fontWeight: 800,
            color: '#F4EEE8',
            lineHeight: 1.02,
            fontSize: numeric ? '2.35rem' : '1.3rem',
            letterSpacing: -0.5,
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Typography>
      </Stack>
    </Paper>
  )
}

/**
 * The KPI datacard row (issue #144). Rendered only on the Overview. Reference
 * style: label + big value + a muted watermark icon in the bottom-right corner.
 */
export default function OverviewDatacards({ cards = [] }) {
  if (!cards.length) return null
  return (
    <Grid container spacing={1}>
      {cards.map((item) => (
        <Grid key={item.label} item xs={12} sm={6} xl={3}>
          <OverviewStatCard item={item} />
        </Grid>
      ))}
    </Grid>
  )
}
