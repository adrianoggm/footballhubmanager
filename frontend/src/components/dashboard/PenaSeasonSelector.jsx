import { Grid, MenuItem, TextField } from '@mui/material'
import { useDashboardContext } from '../../context/dashboardContext.js'
import { DashboardControlField } from './DashboardShell.jsx'

const formatSeasonDate = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

/**
 * The single peña + season context selector rendered in the dashboard header.
 * Reads everything from DashboardContext, so admin and user dashboards share
 * one consistent control instead of each re-implementing the two selects.
 */
export default function PenaSeasonSelector() {
  const {
    loading,
    penas,
    selectedPenaGuid,
    onSelectPena,
    seasons,
    selectedSeasonGuid,
    onSelectSeason,
    activeSeason,
    labels,
  } = useDashboardContext()

  const seasonDisabled = !selectedPenaGuid || !seasons.length || loading

  return (
    <Grid container spacing={0.85}>
      <Grid item xs={12} md={6}>
        <DashboardControlField label={labels.pena}>
          <TextField
            select
            size="small"
            value={selectedPenaGuid}
            onChange={(event) => onSelectPena(event.target.value)}
            inputProps={{ 'aria-label': labels.pena }}
            fullWidth
          >
            {penas.map((pena) => (
              <MenuItem key={pena.guid} value={pena.guid}>
                {pena.name}
              </MenuItem>
            ))}
          </TextField>
        </DashboardControlField>
      </Grid>
      <Grid item xs={12} md={6}>
        <DashboardControlField label={labels.season}>
          <TextField
            select
            size="small"
            value={selectedSeasonGuid}
            onChange={(event) => onSelectSeason(event.target.value)}
            disabled={seasonDisabled}
            inputProps={{ 'aria-label': labels.season }}
            fullWidth
          >
            {seasons.map((season) => (
              <MenuItem key={season.guid} value={season.guid}>
                {formatSeasonDate(season.start_date)} - {formatSeasonDate(season.end_date)}
                {activeSeason?.guid === season.guid ? labels.activeSuffix || '' : ''}
              </MenuItem>
            ))}
          </TextField>
        </DashboardControlField>
      </Grid>
    </Grid>
  )
}
