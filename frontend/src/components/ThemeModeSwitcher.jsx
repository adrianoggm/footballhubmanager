import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { useI18n } from '../i18n/useI18n.js'
import { useThemeMode } from '../theme/useThemeMode.js'

export default function ThemeModeSwitcher() {
  const { t } = useI18n()
  const { themeMode, setThemeMode } = useThemeMode()

  return (
    <Tooltip title={t('theme.label')} placement="bottom">
      <ToggleButtonGroup
        exclusive
        size="small"
        value={themeMode}
        onChange={(_, value) => {
          if (value) {
            setThemeMode(value)
          }
        }}
      >
        <ToggleButton value="light">{t('theme.light')}</ToggleButton>
        <ToggleButton value="system">{t('theme.system')}</ToggleButton>
        <ToggleButton value="dark">{t('theme.dark')}</ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  )
}
