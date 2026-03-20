import { Stack, TextField } from '@mui/material'

/**
 * Componente puro para renderizar campos de formulario de temporada
 * Responsabilidad única: Renderizar campos de fecha y puntos
 */
export function SeasonFormFields({ t, form, onChange, dateErrors = {}, disabled = false }) {
  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          type="date"
          label={t('dashboard.admin.seasons.startDate')}
          InputLabelProps={{ shrink: true }}
          value={form.start_date}
          onChange={onChange('start_date')}
          error={Boolean(dateErrors.start_date)}
          helperText={dateErrors.start_date || undefined}
          disabled={disabled}
          fullWidth
        />
        <TextField
          type="date"
          label={t('dashboard.admin.seasons.endDate')}
          InputLabelProps={{ shrink: true }}
          value={form.end_date}
          onChange={onChange('end_date')}
          error={Boolean(dateErrors.end_date)}
          helperText={dateErrors.end_date || undefined}
          disabled={disabled}
          fullWidth
        />
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          type="number"
          label={t('dashboard.admin.seasons.winPoints')}
          value={form.points_win}
          onChange={onChange('points_win')}
          disabled={disabled}
          fullWidth
        />
        <TextField
          type="number"
          label={t('dashboard.admin.seasons.drawPoints')}
          value={form.points_draw}
          onChange={onChange('points_draw')}
          disabled={disabled}
          fullWidth
        />
        <TextField
          type="number"
          label={t('dashboard.admin.seasons.lossPoints')}
          value={form.points_loss}
          onChange={onChange('points_loss')}
          disabled={disabled}
          fullWidth
        />
      </Stack>
    </>
  )
}
