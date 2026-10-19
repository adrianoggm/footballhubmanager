import { Select, MenuItem, Box, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useDashboardContext } from '../../context/dashboardContext.js'

const formatSeasonDate = (value) => {
  if (!value) {
    return '-'
  }
  const asDate = new Date(`${value}T00:00:00`)
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
  const theme = useTheme()
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

  const isDark = theme.palette.mode === 'dark'

  return (
    <Select
      value={selectedSeasonGuid || ''}
      onChange={(event) => onSelectSeason(event.target.value)}
      disabled={seasonDisabled}
      displayEmpty
      renderValue={(selectedVal) => {
        const selected = seasons.find((s) => s.guid === selectedVal)
        const range = formatSeasonRange(selected)
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 0.5 }}>
            <Box
              component="span"
              sx={{
                color: theme.palette.text.secondary,
                textTransform: 'uppercase',
                fontWeight: 600,
                fontSize: '0.7rem',
                letterSpacing: '0.08em',
              }}
            >
              {labels.season}:
            </Box>
            <Box
              component="span"
              sx={{
                color: theme.palette.secondary.light || theme.palette.secondary.main,
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '0.02em',
              }}
            >
              {range}
            </Box>
          </Box>
        )
      }}
      sx={{
        height: 32,
        backgroundColor: theme.palette.background.default,
        borderRadius: '6px',
        border: `1px solid ${alpha(theme.palette.text.secondary, theme.palette.mode === 'dark' ? 0.25 : 0.35)}`,
        '& .MuiOutlinedInput-notchedOutline': {
          border: 'none',
        },
        '& .MuiSelect-select': {
          py: 0,
          pl: 1.5,
          pr: '28px !important',
          display: 'flex',
          alignItems: 'center',
          height: '100%',
        },
        '& .MuiSelect-icon': {
          color: theme.palette.secondary.light || theme.palette.secondary.main,
          fontSize: '1rem',
          right: 6,
        },
        '&.Mui-disabled': {
          opacity: 0.5,
        },
      }}
    >
      {seasons.map((season) => (
        <MenuItem key={season.guid} value={season.guid} sx={{ fontSize: '0.875rem' }}>
          {formatSeasonRange(season)}
          {activeSeason?.guid === season.guid ? ` (${labels.activeSuffix || 'Active'})` : ''}
        </MenuItem>
      ))}
    </Select>
  )
}
