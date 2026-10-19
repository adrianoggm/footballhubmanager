import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material'
import { useI18n } from '../i18n/useI18n.js'

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n()

  return (
    <Tooltip title={t('language.label')} placement="bottom">
      <ToggleButtonGroup
        exclusive
        size="small"
        value={language}
        onChange={(_, value) => {
          if (value) {
            setLanguage(value)
          }
        }}
        sx={{ alignSelf: 'flex-start' }}
      >
        <ToggleButton value="en">{t('language.en')}</ToggleButton>
        <ToggleButton value="es">{t('language.es')}</ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  )
}
