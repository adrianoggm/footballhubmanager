import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useI18n } from '../../i18n/useI18n.js'
import { formatRating, ratingBucket } from '../../theme/ratingScale.js'

const SIZES = {
  sm: { minWidth: 30, fontSize: '0.72rem', px: 0.6, py: 0.15 },
  md: { minWidth: 36, fontSize: '0.8rem', px: 0.75, py: 0.25 },
  lg: { minWidth: 46, fontSize: '1rem', px: 1, py: 0.4 },
}

/**
 * Rating chip colored by the theme rating scale (>=8 / 7–7.9 / 6–6.9 / <6).
 * Props: value (number | numeric string | null), size? ('sm' | 'md' | 'lg').
 */
export default function RatingBadge({ value, size = 'md' }) {
  const theme = useTheme()
  const { language } = useI18n()
  const bucket = ratingBucket(value)
  const colors = bucket ? theme.custom?.rating?.[bucket] : null
  const dims = SIZES[size] || SIZES.md

  return (
    <Box
      component="span"
      data-rating-bucket={bucket || 'none'}
      sx={{
        display: 'inline-block',
        textAlign: 'center',
        borderRadius: '6px',
        fontWeight: 700,
        lineHeight: 1.45,
        fontVariantNumeric: 'tabular-nums',
        ...dims,
        bgcolor: colors?.bg || alpha(theme.palette.text.primary, 0.08),
        color: colors?.fg || 'text.secondary',
      }}
    >
      {formatRating(value, language)}
    </Box>
  )
}
