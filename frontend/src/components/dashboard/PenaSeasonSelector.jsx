import { Stack, Typography, MenuItem, TextField } from '@mui/material'
import { useDashboardContext } from '../../context/dashboardContext.js'

const formatSeasonDate = (value) => {
  if (!value) {
    return '-'
  }
  // Try to use a shorter format like "YY/YY" or a simple string, but let's keep the date range
  const asDate = new Date(`${value}T00:00:00`)
  // Get short year representation
  const year = asDate.getFullYear().toString().slice(-2)
  return year
}

const formatSeasonRange = (season) => {
  if (!season) return '-'
  const start = formatSeasonDate(season.start_date)
  const end = formatSeasonDate(season.end_date)
  return `${start}/${end}`
}

/**
 * The single season context selector rendered in the dashboard header.
 * Reads everything from DashboardContext.
 */
export default function PenaSeasonSelector() {
  const {
    loading,
    selectedPenaGuid,
    seasons,
    selectedSeasonGuid,
    onSelectSeason,
    activeSeason,
    labels,
  } = useDashboardContext()

  const seasonDisabled = !selectedPenaGuid || !seasons.length || loading

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap' }}
      >
        {labels.season}:
      </Typography>
      <TextField
        select
        size="small"
        value={selectedSeasonGuid}
        onChange={(event) => onSelectSeason(event.target.value)}
        disabled={seasonDisabled}
        inputProps={{ 'aria-label': labels.season }}
        sx={{
          minWidth: 110,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': {
              borderWidth: '1px',
            },
          },
          '& .MuiSelect-select': {
            py: 0.6,
            fontSize: '0.81rem',
            fontWeight: 700,
          }
        }}
      >
        {seasons.map((season) => (
          <MenuItem key={season.guid} value={season.guid} sx={{ fontSize: '0.875rem' }}>
            {formatSeasonRange(season)}
            {activeSeason?.guid === season.guid ? ` (${labels.activeSuffix || 'Active'})` : ''}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  )
}
