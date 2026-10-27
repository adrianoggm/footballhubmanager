import { Box, Link, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Link as RouterLink } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n.js'
import { legalPath } from '../legal/legalDocuments.js'
import { touchTargetLinkSx } from './touchTarget.js'

const GITHUB_URL = 'https://github.com/adrianoggm/footballhubmanager'
const LEGAL_LINKS = [
  { document: 'contact', labelKey: 'footer.contact' },
  { document: 'terms', labelKey: 'footer.terms' },
  { document: 'privacy', labelKey: 'footer.privacy' },
  { document: 'accessibility', labelKey: 'footer.accessibility' },
]

const footerLinkSx = {
  color: 'text.secondary',
  fontSize: '0.75rem',
  lineHeight: 1.6,
  transition: 'color 140ms ease',
  '&:hover': { color: 'secondary.main' },
  ...touchTargetLinkSx,
}

/**
 * Flat single-line page footer (X-style): one wrapping row of small links
 * separated by pipes, ending with the copyright. No surface, no columns —
 * page chrome, not another dashboard panel.
 * `sections` is an optional array of { path, titleKey } (a dashboard sitemap).
 */
export default function AppFooter({ sections = [] }) {
  const { t } = useI18n()
  const theme = useTheme()
  const year = new Date().getFullYear()

  const separator = (
    <Typography
      component="span"
      variant="caption"
      sx={{ color: alpha(theme.palette.text.secondary, 0.45), lineHeight: 1.6 }}
    >
      |
    </Typography>
  )

  return (
    <Box component="footer" sx={{ mt: { xs: 3, md: 4 }, py: 2.5 }}>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1.25}
        rowGap={0.75}
        justifyContent="center"
        alignItems="center"
        divider={separator}
      >
        {sections.map((section) => (
          <Link
            key={section.path}
            component={RouterLink}
            to={section.path}
            underline="none"
            sx={footerLinkSx}
          >
            {t(section.titleKey)}
          </Link>
        ))}
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.document}
            component={RouterLink}
            to={legalPath(link.document)}
            underline="none"
            sx={footerLinkSx}
          >
            {t(link.labelKey)}
          </Link>
        ))}
        <Link
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          sx={footerLinkSx}
        >
          GitHub
        </Link>
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          {t('footer.rights', { year, brand: t('app.brand') })}
        </Typography>
      </Stack>
    </Box>
  )
}
