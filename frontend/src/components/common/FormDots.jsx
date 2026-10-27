import { Box, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useI18n } from '../../i18n/useI18n.js'
import { buildFormSequence } from './formResults.js'

/**
 * Recent form as small lettered squares (V/E/D or W/D/L), oldest first.
 * Props: results (array of 'win' | 'draw' | 'loss' or aliases), max? (default 5).
 */
export default function FormDots({ results = [], max = 5 }) {
  const theme = useTheme()
  const { t } = useI18n()
  const sequence = buildFormSequence(results, max)

  if (!sequence.length) {
    return null
  }

  return (
    <Stack
      direction="row"
      spacing={0.25}
      role="img"
      aria-label={sequence.map((result) => t(`ui.form.${result}Name`)).join(', ')}
    >
      {sequence.map((result, index) => (
        <Box
          key={`${result}-${index}`}
          component="span"
          aria-hidden="true"
          sx={{
            width: 18,
            height: 18,
            borderRadius: '4px',
            display: 'inline-grid',
            placeItems: 'center',
            fontSize: '0.62rem',
            fontWeight: 700,
            bgcolor: theme.custom?.form?.[result]?.bg,
            color: theme.custom?.form?.[result]?.fg,
          }}
        >
          {t(`ui.form.${result}`)}
        </Box>
      ))}
    </Stack>
  )
}
