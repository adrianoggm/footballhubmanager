import { Box, Link, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Link as RouterLink } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n.js'

const GITHUB_URL = 'https://github.com/adrianoggm/footballhubmanager'
// Placeholder address until a real support inbox exists.
const CONTACT_EMAIL = 'contacto@footballhubmanager.app'

const footerLinkSx = {
  color: 'text.secondary',
  fontSize: '0.75rem',
  lineHeight: 1.6,
  transition: 'color 140ms ease',
  '&:hover': { color: 'secondary.main' },
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
        <Link href={`mailto:${CONTACT_EMAIL}`} underline="none" sx={footerLinkSx}>
          {t('footer.contact')}
        </Link>
        <Link component={RouterLink} to="/legal/terms" underline="none" sx={footerLinkSx}>
          {t('footer.terms')}
        </Link>
        <Link component={RouterLink} to="/legal/privacy" underline="none" sx={footerLinkSx}>
          {t('footer.privacy')}
        </Link>
        <Link component={RouterLink} to="/legal/accessibility" underline="none" sx={footerLinkSx}>
          {t('footer.accessibility')}
        </Link>
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
