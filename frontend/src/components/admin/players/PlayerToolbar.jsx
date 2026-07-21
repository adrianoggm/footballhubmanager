import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  Menu,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'
import { SEASON_STATUS } from './playersHelpers.js'

// Warm accountability palette (issue #147) — shared with StatCard /
// AdminAccountabilitySection so the Player Directory toolbar reads as the
// same system rather than inventing a new visual language.
const SURFACE = '#45342C'
const TEXT_COLOR = '#F4EEE8'
const MUTED = '#88736A'
const ACCENT = '#FCB491'

const controlLabelSx = {
  color: TEXT_COLOR,
  m: 0,
  '& .MuiFormControlLabel-label': { fontSize: '0.9rem' },
}

const radioCheckboxSx = {
  color: MUTED,
  '&.Mui-checked': { color: ACCENT },
}

const sectionLabelSx = {
  fontWeight: 700,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: MUTED,
  px: 2,
  pt: 1.5,
  pb: 0.5,
}

const toggleInArray = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value]

/**
 * Presentational, controlled toolbar for the Player Directory: a search box
 * plus Filters (role/position/status) and Sort popovers. All state lives in
 * `useAdminPlayers` (toolbar/toolbarActions) — this component only renders
 * and calls back via `actions`.
 */
export default function PlayerToolbar({ toolbar, actions, roleOptions, positionOptions, t }) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)
  const [filtersAnchor, setFiltersAnchor] = useState(null)
  const [sortAnchor, setSortAnchor] = useState(null)

  const roleFilter = toolbar.roleFilter || []
  const positionFilter = toolbar.positionFilter || []

  const menuPaperSx = {
    backgroundColor: SURFACE,
    color: TEXT_COLOR,
    borderRadius: geometry.surfaceRadiusTight,
    minWidth: 260,
  }

  const handleSearchChange = (event) => {
    actions.setSearch(event.target.value)
    actions.setPage(1)
  }

  const handleRoleToggle = (role) => {
    actions.setRoleFilter(toggleInArray(roleFilter, role))
    actions.setPage(1)
  }

  const handlePositionToggle = (position) => {
    actions.setPositionFilter(toggleInArray(positionFilter, position))
    actions.setPage(1)
  }

  const handleStatusChange = (event) => {
    actions.setStatusFilter(event.target.value)
    actions.setPage(1)
  }

  const closeFilters = () => setFiltersAnchor(null)
  const closeSort = () => setSortAnchor(null)

  const handleSortChange = (event) => {
    actions.setSort(event.target.value)
    actions.setPage(1)
    closeSort()
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      justifyContent="space-between"
      flexWrap="wrap"
      sx={{ width: '100%' }}
    >
      <TextField
        size="small"
        placeholder={t('dashboard.admin.directory.searchPlaceholder')}
        value={toolbar.search}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <Box
              component="span"
              className="material-symbols-rounded"
              sx={{ mr: 1, display: 'flex', color: MUTED, fontSize: 20 }}
            >
              search
            </Box>
          ),
        }}
        sx={{ flexGrow: 1, minWidth: 220, maxWidth: { xs: '100%', sm: 360 } }}
      />

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button
          variant="outlined"
          onClick={(event) => setFiltersAnchor(event.currentTarget)}
          startIcon={
            <Box component="span" className="material-symbols-rounded">
              filter_list
            </Box>
          }
        >
          {t('dashboard.admin.directory.filtersLabel')}
        </Button>
        <Button
          variant="outlined"
          onClick={(event) => setSortAnchor(event.currentTarget)}
          startIcon={
            <Box component="span" className="material-symbols-rounded">
              sort
            </Box>
          }
        >
          {t('dashboard.admin.directory.sortLabel')}
        </Button>
      </Stack>

      <Menu
        anchorEl={filtersAnchor}
        open={Boolean(filtersAnchor)}
        onClose={closeFilters}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: menuPaperSx }}
      >
        <Typography sx={sectionLabelSx}>{t('dashboard.admin.directory.filterRole')}</Typography>
        <FormGroup sx={{ px: 2, pb: 0.5 }}>
          {(roleOptions || []).map((role) => (
            <FormControlLabel
              key={role}
              sx={controlLabelSx}
              control={
                <Checkbox
                  size="small"
                  checked={roleFilter.includes(role)}
                  onChange={() => handleRoleToggle(role)}
                  sx={radioCheckboxSx}
                />
              }
              label={role}
            />
          ))}
        </FormGroup>

        <Divider sx={{ borderColor: alpha(TEXT_COLOR, 0.12) }} />

        <Typography sx={sectionLabelSx}>{t('dashboard.admin.directory.filterPosition')}</Typography>
        <FormGroup sx={{ px: 2, pb: 0.5 }}>
          {(positionOptions || []).map((position) => (
            <FormControlLabel
              key={position}
              sx={controlLabelSx}
              control={
                <Checkbox
                  size="small"
                  checked={positionFilter.includes(position)}
                  onChange={() => handlePositionToggle(position)}
                  sx={radioCheckboxSx}
                />
              }
              label={position}
            />
          ))}
        </FormGroup>

        <Divider sx={{ borderColor: alpha(TEXT_COLOR, 0.12) }} />

        <Typography sx={sectionLabelSx}>{t('dashboard.admin.directory.filterStatus')}</Typography>
        <RadioGroup
          value={toolbar.statusFilter}
          onChange={handleStatusChange}
          sx={{ px: 2, pb: 1 }}
        >
          <FormControlLabel
            value={SEASON_STATUS.ALL}
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.statusAll')}
          />
          <FormControlLabel
            value={SEASON_STATUS.IN_SEASON}
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.statusInSeason')}
          />
          <FormControlLabel
            value={SEASON_STATUS.OUT_OF_SEASON}
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.statusOutOfSeason')}
          />
        </RadioGroup>
      </Menu>

      <Menu
        anchorEl={sortAnchor}
        open={Boolean(sortAnchor)}
        onClose={closeSort}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: menuPaperSx }}
      >
        <RadioGroup value={toolbar.sort} onChange={handleSortChange} sx={{ px: 2, py: 1 }}>
          <FormControlLabel
            value="name_asc"
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.sortNameAsc')}
          />
          <FormControlLabel
            value="name_desc"
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.sortNameDesc')}
          />
          <FormControlLabel
            value="status_active"
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.sortStatusActive')}
          />
          <FormControlLabel
            value="status_inactive"
            sx={controlLabelSx}
            control={<Radio size="small" sx={radioCheckboxSx} />}
            label={t('dashboard.admin.directory.sortStatusInactive')}
          />
        </RadioGroup>
      </Menu>
    </Stack>
  )
}
