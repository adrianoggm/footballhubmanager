import { Stack, Typography } from '@mui/material'
import { useI18n } from '../../i18n/useI18n.js'
import LanguageSwitcher from '../LanguageSwitcher.jsx'
import ThemeModeSwitcher from '../ThemeModeSwitcher.jsx'
import { DashboardControlField } from './DashboardShell.jsx'

/**
 * Appearance + language preferences, grouped for the settings dialogs (admin peña
 * settings / user profile settings) so they no longer clutter the dashboard header.
 *
 * Language defaults to the browser language on first load (see I18nProvider's
 * getInitialLanguage); changing it here persists an explicit override.
 */
export default function AppearanceSettings() {
  const { t } = useI18n()

  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {t('dashboard.common.appearanceTitle')}
      </Typography>
      <DashboardControlField label={t('theme.label')}>
        <ThemeModeSwitcher />
      </DashboardControlField>
      <DashboardControlField label={t('language.label')}>
        <LanguageSwitcher />
      </DashboardControlField>
    </Stack>
  )
}
