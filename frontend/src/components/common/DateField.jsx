import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { useI18n } from '../../i18n/useI18n.js'

const ISO_FORMAT = 'YYYY-MM-DD'

const toDayjs = (iso) => {
  if (!iso) {
    return null
  }
  const parsed = dayjs(iso, ISO_FORMAT)
  return parsed.isValid() ? parsed : null
}

/**
 * Themed, localized date picker that speaks ISO date strings ('YYYY-MM-DD'),
 * matching how forms and the API store dates. Replaces native `type="date"`
 * inputs so the calendar popup follows the app theme and the active language.
 *
 * Props: label, value (ISO string or ''), onChange(isoString), minIso?, maxIso?,
 * disabled?, error?, helperText?, size?, fullWidth?, sx?
 */
export default function DateField({
  label,
  value,
  onChange,
  minIso = '',
  maxIso = '',
  disabled = false,
  error = false,
  helperText = '',
  size = 'medium',
  fullWidth = false,
  sx = undefined,
}) {
  const { language } = useI18n()

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}>
      <DatePicker
        label={label}
        value={toDayjs(value)}
        // European display format regardless of UI language; the calendar popup
        // (month/weekday names) still follows the active locale.
        format="DD/MM/YYYY"
        onChange={(next) => {
          onChange(next && next.isValid() ? next.format(ISO_FORMAT) : '')
        }}
        minDate={toDayjs(minIso) || undefined}
        maxDate={toDayjs(maxIso) || undefined}
        disabled={disabled}
        slotProps={{
          textField: {
            size,
            fullWidth,
            error,
            helperText,
            sx,
          },
        }}
      />
    </LocalizationProvider>
  )
}
