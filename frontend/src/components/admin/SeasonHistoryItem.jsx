import { Box, Button, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

/**
 * Componente puro para renderizar un item de temporada en el historial
 * Responsabilidad única: Renderizar información de una temporada
 */
export function SeasonHistoryItem({ season, formatDate, t, isSelected, onSelect }) {
  return (
    <Box
      sx={(theme) => ({
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${
          isSelected
            ? alpha(theme.palette.secondary.main, 0.45)
            : alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.12 : 0.08)
        }`,
        // theme surface instead of a translucent white that washed out dark presets
        backgroundColor: theme.custom.surfaces.inset,
      })}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="body2">
            {formatDate(season.start_date)} - {formatDate(season.end_date)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('dashboard.admin.seasons.historyPoints', {
              win: season.points_win,
              draw: season.points_draw,
              loss: season.points_loss,
            })}
          </Typography>
        </Box>
        <Button
          size="small"
          variant={isSelected ? 'contained' : 'text'}
          onClick={onSelect}
          disabled={isSelected}
        >
          {isSelected
            ? t('dashboard.admin.seasons.selectedSeasonAction')
            : t('dashboard.admin.seasons.selectSeasonAction')}
        </Button>
      </Stack>
    </Box>
  )
}
