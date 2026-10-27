import { Stack, TextField } from '@mui/material'
import DateField from '../common/DateField.jsx'

const POINT_FIELDS = [
  ['points_win', 'dashboard.admin.seasons.winPoints'],
  ['points_draw', 'dashboard.admin.seasons.drawPoints'],
  ['points_loss', 'dashboard.admin.seasons.lossPoints'],
]

/**
 * Componente puro para renderizar campos de formulario de temporada
 * Responsabilidad única: Renderizar campos de fecha y puntos
 *
 * `errors` holds per-field messages (dates and points) from
 * seasonFormValidation.js; the same component serves the create and edit forms.
 */
export function SeasonFormFields({ t, form, onChange, errors = {}, disabled = false }) {
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <DateField
          label={t('dashboard.admin.seasons.startDate')}
          value={form.start_date}
          onChange={(iso) => onChange('start_date')({ target: { value: iso } })}
          maxIso={form.end_date || ''}
          error={Boolean(errors.start_date)}
          helperText={errors.start_date || undefined}
          disabled={disabled}
          fullWidth
        />
        <DateField
          label={t('dashboard.admin.seasons.endDate')}
          value={form.end_date}
          onChange={(iso) => onChange('end_date')({ target: { value: iso } })}
          minIso={form.start_date || ''}
          error={Boolean(errors.end_date)}
          helperText={errors.end_date || undefined}
          disabled={disabled}
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        {POINT_FIELDS.map(([name, labelKey]) => (
          <TextField
            key={name}
            type="number"
            label={t(labelKey)}
            value={form[name]}
            onChange={onChange(name)}
            error={Boolean(errors[name])}
            helperText={errors[name] || undefined}
            inputProps={{ min: 0, step: 1 }}
            required
            disabled={disabled}
            fullWidth
          />
        ))}
      </Stack>
    </>
  )
}
