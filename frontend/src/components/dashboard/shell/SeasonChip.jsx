import { Box, Button, ButtonBase, Divider, Menu, MenuItem, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { useDashboardContext } from '../../../context/dashboardContext.js'
import { useI18n } from '../../../i18n/useI18n.js'
import ShellIcon from './ShellIcon.jsx'
import { StatusDot } from './shellParts.jsx'
import { formatSeasonLong, formatSeasonRange, formatSeasonShort } from './shellLogic.js'

/**
 * Season selector chip (green dot = active season) with a popover listing the
 * peña's seasons. `size`: 'regular' (desktop topbar) | 'compact' (mobile).
 */
export default function SeasonChip({ size = 'regular', onManageSeasons = null }) {
  const theme = useTheme()
  const { t, language } = useI18n()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}
  const {
    loading,
    selectedPenaGuid,
    seasons,
    selectedSeasonGuid,
    selectedSeason,
    activeSeason,
    onSelectSeason,
  } = useDashboardContext()
  const [anchor, setAnchor] = useState(null)
  const compact = size === 'compact'
  const disabled = !selectedPenaGuid || !seasons.length || loading
  const isActive = Boolean(selectedSeason && activeSeason?.guid === selectedSeason.guid)
  const label = selectedSeason
    ? compact
      ? formatSeasonShort(selectedSeason)
      : formatSeasonLong(selectedSeason)
    : t('shell.noSeason')

  return (
    <>
      <ButtonBase
        aria-label={`${t('shell.seasonSelectorLabel')}: ${label}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        disabled={disabled}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{
          gap: 1,
          height: compact ? 30 : 32,
          px: compact ? 1 : 1.25,
          borderRadius: '8px',
          flex: 'none',
          fontSize: '0.8rem',
          color: tones.subtle,
          border: `1px solid ${compact ? 'transparent' : shell.lineStrong}`,
          bgcolor: compact ? tones.accentSoftBg : shell.control,
          opacity: disabled ? 0.6 : 1,
          '&:hover': { borderColor: compact ? 'transparent' : tones.muted },
        }}
      >
        {selectedSeason ? <StatusDot active={isActive} /> : null}
        {compact ? null : <span>{t('shell.season')}</span>}
        <Box
          component="b"
          sx={{
            fontWeight: 700,
            color: compact ? tones.accentStrong : 'text.primary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {label}
        </Box>
        <ShellIcon name="chevron" size={14} />
      </ButtonBase>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            mt: 0.75,
            minWidth: 280,
            p: 0.5,
            bgcolor: shell.popover,
            backgroundImage: 'none',
            border: `1px solid ${shell.lineStrong}`,
            borderRadius: '12px',
          },
        }}
      >
        {seasons.map((season) => {
          const selected = season.guid === selectedSeasonGuid
          const active = activeSeason?.guid === season.guid
          return (
            <MenuItem
              key={season.guid}
              selected={selected}
              onClick={() => {
                setAnchor(null)
                onSelectSeason(season.guid)
              }}
              sx={{
                gap: 1.25,
                borderRadius: '8px',
                py: 1,
                '&.Mui-selected, &.Mui-selected:hover': { bgcolor: tones.accentSoftBg },
              }}
            >
              <StatusDot active={active} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography component="span" sx={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    {formatSeasonLong(season)}
                  </Typography>
                  {active ? (
                    <Box
                      component="span"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        px: 0.75,
                        borderRadius: 999,
                        color: theme.palette.success.main,
                        bgcolor: alpha(theme.palette.success.main, 0.16),
                      }}
                    >
                      {t('shell.seasonActive')}
                    </Box>
                  ) : null}
                </Box>
                <Typography component="span" sx={{ fontSize: '0.74rem', color: tones.subtle }}>
                  {formatSeasonRange(season, language)}
                  {active ? '' : ` · ${t('shell.seasonReadOnly')}`}
                </Typography>
              </Box>
              {selected ? <ShellIcon name="check" size={16} /> : null}
            </MenuItem>
          )
        })}
        {onManageSeasons ? <Divider sx={{ my: 0.5, borderColor: shell.line }} /> : null}
        {onManageSeasons ? (
          <MenuItem
            onClick={() => {
              setAnchor(null)
              onManageSeasons()
            }}
            sx={{ gap: 1.25, borderRadius: '8px', color: tones.subtle, fontSize: '0.85rem' }}
          >
            <ShellIcon name="calendar" size={16} />
            {t('shell.manageSeasons')}
          </MenuItem>
        ) : null}
      </Menu>
    </>
  )
}

/**
 * Amber strip shown while a non-active season is selected. Informative only:
 * it does not change any permission.
 */
export function ReadOnlySeasonStrip() {
  const theme = useTheme()
  const { t } = useI18n()
  const { selectedSeason, activeSeason, onSelectSeason } = useDashboardContext()

  if (!selectedSeason || !activeSeason || selectedSeason.guid === activeSeason.guid) {
    return null
  }

  const warning = theme.palette.warning.main
  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        columnGap: 1.5,
        rowGap: 0.25,
        px: { xs: 2, md: 3.5 },
        py: 0.75,
        fontSize: '0.8rem',
        color: theme.palette.mode === 'dark' ? warning : theme.palette.text.primary,
        bgcolor: alpha(warning, theme.palette.mode === 'dark' ? 0.14 : 0.16),
        borderBottom: `1px solid ${alpha(warning, 0.3)}`,
      }}
    >
      <ShellIcon name="calendar" size={15} />
      <Box component="span" sx={{ fontWeight: 600 }}>
        {t('shell.readOnlyStrip', { season: formatSeasonLong(selectedSeason) })}
      </Box>
      <Button
        size="small"
        color="inherit"
        onClick={() => onSelectSeason(activeSeason.guid)}
        sx={{ minHeight: 26, py: 0, px: 1, fontWeight: 700, textDecoration: 'underline' }}
      >
        {t('shell.backToActive')}
      </Button>
    </Box>
  )
}
