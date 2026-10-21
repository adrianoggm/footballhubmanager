import { Alert, Box, Paper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useI18n } from '../../i18n/useI18n.js'
import { getSurfaceGeometry } from '../common/surfaceGeometry.js'
import { LEGAL_DOCUMENTS } from './legalDocuments.js'

/**
 * Renders one public legal/info document (contact, terms, privacy,
 * accessibility) from i18n: title, intro and the ordered sections declared in
 * LEGAL_DOCUMENTS. `document` must be a key of LEGAL_DOCUMENTS; `action` is an
 * optional node rendered at the bottom (e.g. a back button).
 */
export default function LegalDocument({ document, action = null }) {
  const { t } = useI18n()
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)
  const base = `legal.pages.${document}`
  const titleId = `legal-${document}-title`

  return (
    <Paper
      component="article"
      aria-labelledby={titleId}
      elevation={0}
      sx={{
        maxWidth: 860,
        width: '100%',
        mx: 'auto',
        borderRadius: geometry.surfaceRadius,
        border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
        boxShadow: geometry.cardShadow,
        px: { xs: 2.5, md: 4 },
        py: { xs: 3, md: 4 },
      }}
    >
      <Stack spacing={3}>
        <Stack spacing={1.5}>
          <Typography id={titleId} variant="h4" component="h1">
            {t(`${base}.title`)}
          </Typography>
          <Alert severity="warning" variant="outlined">
            <Typography variant="subtitle2" component="p">
              {t('legal.draftNotice')}
            </Typography>
            <Typography variant="body2">{t('legal.draftHint')}</Typography>
          </Alert>
          <Typography variant="body1" color="text.secondary">
            {t(`${base}.intro`)}
          </Typography>
        </Stack>

        {LEGAL_DOCUMENTS[document].map((sectionId) => (
          <Box component="section" key={sectionId}>
            <Typography variant="h6" component="h2" gutterBottom>
              {t(`${base}.sections.${sectionId}.heading`)}
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
              {t(`${base}.sections.${sectionId}.body`)}
            </Typography>
          </Box>
        ))}

        {action ? <Box>{action}</Box> : null}
      </Stack>
    </Paper>
  )
}
