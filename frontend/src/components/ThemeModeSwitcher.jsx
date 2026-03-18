import { MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { useI18n } from '../i18n/useI18n.js'
import { THEME_PRESETS } from '../theme.js'
import { useThemeMode } from '../theme/useThemeMode.js'

export default function ThemeModeSwitcher() {
  const { t } = useI18n()
  const {
    themeMode,
    resolvedThemeMode,
    resolvedThemePresetId,
    availableThemePresetIds,
    setThemeMode,
    setThemePreset,
  } = useThemeMode()

  return (
    <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
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

      <TextField
        select
        size="small"
        value={resolvedThemePresetId}
        onChange={(event) => setThemePreset(event.target.value)}
        inputProps={{
          'aria-label':
            resolvedThemeMode === 'dark' ? t('theme.darkPreset') : t('theme.lightPreset'),
        }}
        sx={{
          minWidth: { xs: 132, md: 148 },
        }}
      >
        {availableThemePresetIds.map((presetId) => (
          <MenuItem key={presetId} value={presetId}>
            {t(THEME_PRESETS[presetId].labelKey)}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}
