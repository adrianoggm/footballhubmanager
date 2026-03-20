import { Box, Button, Stack, Typography } from '@mui/material'

/**
 * Componente puro para renderizar un item de temporada en el historial
 * Responsabilidad única: Renderizar información de una temporada
 */
export function SeasonHistoryItem({ season, formatDate, t, isSelected, onSelect }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: isSelected ? '1px solid rgba(25,118,210,0.35)' : '1px solid rgba(15,23,42,0.08)',
        backgroundColor: 'rgba(255,255,255,0.6)',
      }}
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
