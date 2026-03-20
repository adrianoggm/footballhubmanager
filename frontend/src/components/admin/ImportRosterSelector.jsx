import { MenuItem, TextField, Typography } from '@mui/material'

/**
 * Componente puro para renderizar selector de importación de rosters
 * Responsabilidad única: Mostrar UI de importación condicionalmente
 */
export function ImportRosterSelector({
  t,
  importEnabled,
  candidates,
  selectedGuid,
  onSourceChange,
  formatDate,
}) {
  // No hay rosters disponibles
  if (!importEnabled) {
    return null
  }

  if (candidates.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('dashboard.admin.seasons.importSourceEmpty')}
      </Typography>
    )
  }

  // Mostrar selector de rosters
  return (
    <TextField
      select
      label={t('dashboard.admin.seasons.importSourceLabel')}
      value={selectedGuid}
      onChange={onSourceChange}
      helperText={t('dashboard.admin.seasons.importSourceHelper')}
      fullWidth
    >
      {candidates.map((season) => (
        <MenuItem key={season.guid} value={season.guid}>
          {formatDate(season.start_date)} - {formatDate(season.end_date)}
        </MenuItem>
      ))}
    </TextField>
  )
}
