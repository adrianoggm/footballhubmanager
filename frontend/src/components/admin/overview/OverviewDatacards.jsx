import { Grid, Paper, Stack, SvgIcon, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

// Watermark-style corner glyphs (no icon lib; house style is inline SvgIcon).
const GLYPHS = {
  players:
    'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  matches:
    'M12 3 4 6v6c0 4.4 3.4 8.5 8 9.6 4.6-1.1 8-5.2 8-9.6V6l-8-3Zm0 4.3 4 2.9-1.5 4.7H9.5L8 10.2l4-2.9Z',
  goals:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  scorer:
    'M7 4h10v2h3v3a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 15.9V18h3v2H8v-2h3v-2.1A5 5 0 0 1 7.4 13H7a4 4 0 0 1-4-4V6h4V4Zm0 4H5v1a2 2 0 0 0 2 2V8Zm10 0v3a2 2 0 0 0 2-2V8h-2Z',
}

const toneKey = (tone) =>
  ['primary', 'secondary', 'success', 'warning', 'info', 'error'].includes(tone)
    ? tone
    : 'secondary'

function OverviewStatCard({ item }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const accent = theme.palette[toneKey(item.tone)].main
  const radius = theme.custom?.dashboard?.radius?.surface || '14px'
  const value = String(item.value ?? '').trim() || '-'
  const long = value.length > 12

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 108,
        height: '100%',
        borderRadius: radius,
        border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.06 : 0.07)}`,
        background: `linear-gradient(160deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(
          theme.palette.background.default,
          isDark ? 0.85 : 0.82
        )} 100%)`,
        px: 1.75,
        py: 1.5,
      }}
    >
      {/* watermark icon, bottom-right */}
      <SvgIcon
        viewBox="0 0 24 24"
        sx={{
          position: 'absolute',
          right: 10,
          bottom: 8,
          fontSize: 46,
          color: alpha(accent, isDark ? 0.42 : 0.35),
          pointerEvents: 'none',
        }}
      >
        <path d={GLYPHS[item.icon] || GLYPHS.players} fill="currentColor" fillRule="evenodd" />
      </SvgIcon>

      <Stack spacing={0.5} sx={{ position: 'relative', zIndex: 1, pr: 5 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 0.6, lineHeight: 1.1 }}
        >
          {item.label}
        </Typography>
        <Typography
          sx={{
            fontWeight: 800,
            color: 'text.primary',
            lineHeight: 1.05,
            fontSize: long ? '1.15rem' : '1.7rem',
            letterSpacing: -0.4,
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Typography>
        {item.helper ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontSize: '0.74rem', lineHeight: 1.25 }}
          >
            {item.helper}
          </Typography>
        ) : null}
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
