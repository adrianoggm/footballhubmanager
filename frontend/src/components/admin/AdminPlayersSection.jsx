import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

const labelChipSx = (color) => ({
  backgroundColor: color || '#64748B',
  color: '#fff',
  border: '1px solid rgba(15, 23, 42, 0.12)',
})

const renderFilterValue = (selected, emptyLabel) => {
  const values = Array.isArray(selected)
    ? selected.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  return values.length ? values.join(', ') : emptyLabel
}

function LabelColorList({ labels, colors, onColorChange }) {
  if (!labels.length) {
    return null
  }

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {labels.map((label) => (
        <Stack
          key={label}
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Chip size="small" label={label} sx={labelChipSx(colors[label])} />
          <TextField
            type="color"
            size="small"
            value={colors[label]}
            onChange={onColorChange(label)}
            sx={{ width: 72 }}
            inputProps={{
              'aria-label': `${label} color`,
            }}
          />
        </Stack>
      ))}
    </Stack>
  )
}

export default function AdminPlayersSection({ state, actions, helpers }) {
  const { t, formatPlayerDisplayName } = helpers
  const {
    selectedSeason,
    selectedSeasonLabel,
    seasonList,
    selectedHistoricalGuids,
    availableHistoricalPlayers,
    loading,
    selectedSeasonGuid,
    seasonRosterLoading,
    seasonRoster,
    historicalPlayers,
    filteredHistoricalPlayers,
    penaLabels,
    labelsDraft,
    draftRoleLabels,
    draftPositionLabels,
    draftRoleColors,
    draftPositionColors,
    memberFilters,
    guestForm,
    nationalities,
  } = state
  const {
    handleSelectHistoricalPlayers,
    handleRegisterHistoricalPlayersInSeason,
    handleEditSeasonPlayer,
    handleRequestRemoveSeasonPlayer,
    onGuestField,
    handleCreateGuestPlayer,
    handleEditMembershipPlayer,
    handleRequestRemoveMembershipPlayer,
    onMemberFilterField,
    onLabelsDraftField,
    onLabelColorDraftChange,
    handleSavePenaLabels,
  } = actions

  const [membersPage, setMembersPage] = useState(0)
  const [membersRowsPerPage, setMembersRowsPerPage] = useState(25)
  const [seasonRosterPage, setSeasonRosterPage] = useState(0)
  const [seasonRosterRowsPerPage, setSeasonRosterRowsPerPage] = useState(25)
  const [labelsEditorOpen, setLabelsEditorOpen] = useState(false)

  const historicalPlayersByGuid = useMemo(
    () => new Map(historicalPlayers.map((player) => [player.guid, player])),
    [historicalPlayers]
  )

  const selectedHistoricalPlayers = useMemo(
    () => selectedHistoricalGuids.map((guid) => historicalPlayersByGuid.get(guid)).filter(Boolean),
    [selectedHistoricalGuids, historicalPlayersByGuid]
  )

  const pagedSeasonRoster = useMemo(() => {
    const start = seasonRosterPage * seasonRosterRowsPerPage
    return seasonRoster.slice(start, start + seasonRosterRowsPerPage)
  }, [seasonRoster, seasonRosterPage, seasonRosterRowsPerPage])

  const pagedHistoricalPlayers = useMemo(() => {
    const start = membersPage * membersRowsPerPage
    return filteredHistoricalPlayers.slice(start, start + membersRowsPerPage)
  }, [filteredHistoricalPlayers, membersPage, membersRowsPerPage])

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(seasonRoster.length / seasonRosterRowsPerPage) - 1)
    if (seasonRosterPage > maxPage) {
      setSeasonRosterPage(maxPage)
    }
  }, [seasonRoster.length, seasonRosterPage, seasonRosterRowsPerPage])

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(filteredHistoricalPlayers.length / membersRowsPerPage) - 1
    )
    if (membersPage > maxPage) {
      setMembersPage(maxPage)
    }
  }, [filteredHistoricalPlayers.length, membersPage, membersRowsPerPage])

  return (
    <Grid container spacing={2.5} sx={{ width: '100%' }}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{t('dashboard.admin.labels.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.labels.description')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.admin.labels.colorHelper')}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label={t('dashboard.admin.labels.roleLabels')}
                    value={labelsDraft.role_labels}
                    onChange={onLabelsDraftField('role_labels')}
                    helperText={t('dashboard.admin.labels.inputHelper')}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  {draftRoleLabels.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {draftRoleLabels.map((roleLabel) => (
                        <Stack
                          key={roleLabel}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Chip
                            size="small"
                            label={roleLabel}
                            sx={labelChipSx(draftRoleColors[roleLabel])}
                          />
                          <TextField
                            type="color"
                            size="small"
                            value={draftRoleColors[roleLabel]}
                            onChange={onLabelColorDraftChange('role_colors', roleLabel)}
                            sx={{ width: 72 }}
                            inputProps={{
                              'aria-label': `${roleLabel} color`,
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label={t('dashboard.admin.labels.positionLabels')}
                    value={labelsDraft.position_labels}
                    onChange={onLabelsDraftField('position_labels')}
                    helperText={t('dashboard.admin.labels.inputHelper')}
                    multiline
                    minRows={2}
                    fullWidth
                  />
                  {draftPositionLabels.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 1 }}>
                      {draftPositionLabels.map((positionLabel) => (
                        <Stack
                          key={positionLabel}
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Chip
                            size="small"
                            label={positionLabel}
                            sx={labelChipSx(draftPositionColors[positionLabel])}
                          />
                          <TextField
                            type="color"
                            size="small"
                            value={draftPositionColors[positionLabel]}
                            onChange={onLabelColorDraftChange('position_colors', positionLabel)}
                            sx={{ width: 72 }}
                            inputProps={{
                              'aria-label': `${positionLabel} color`,
                            }}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Grid>
              </Grid>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={handleSavePenaLabels} disabled={loading}>
                  {t('dashboard.admin.labels.save')}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.labels.currentCounts', {
                    roles: penaLabels.role_labels.length,
                    positions: penaLabels.position_labels.length,
                  })}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={8}>
        <Stack spacing={2.5}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                  spacing={1.5}
                >
                  <Typography variant="h6">{t('dashboard.admin.players.squadTitle')}</Typography>
                  {selectedSeason && (
                    <Chip size="small" color="primary" label={selectedSeasonLabel} />
                  )}
                </Stack>

                {!seasonList.length && (
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.players.createSeasonFirst')}
                  </Typography>
                )}

                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={availableHistoricalPlayers}
                  value={selectedHistoricalPlayers}
                  onChange={(_, selectedPlayers) =>
                    handleSelectHistoricalPlayers({
                      target: {
                        value: selectedPlayers.map((player) => player.guid),
                      },
                    })
                  }
                  getOptionLabel={(option) => formatPlayerDisplayName(option)}
                  isOptionEqualToValue={(option, value) => option.guid === value.guid}
                  disabled={loading || !selectedSeasonGuid || !availableHistoricalPlayers.length}
                  filterSelectedOptions
                  fullWidth
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('dashboard.admin.players.historicalMembersLabel')}
                      helperText={
                        !selectedSeasonGuid
                          ? t('dashboard.admin.players.helperSelectSeason')
                          : availableHistoricalPlayers.length
                            ? t('dashboard.admin.players.helperSome')
                            : t('dashboard.admin.players.helperNone')
                      }
                    />
                  )}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={handleRegisterHistoricalPlayersInSeason}
                    disabled={loading || !selectedSeasonGuid || !selectedHistoricalGuids.length}
                  >
                    {t('dashboard.admin.players.addSelectedToSeason')}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.players.registeredAvailable', {
                      registered: seasonRoster.length,
                      available: availableHistoricalPlayers.length,
                    })}
                  </Typography>
                </Stack>

                {seasonRosterLoading && <LinearProgress />}

                {selectedSeasonGuid && !seasonRosterLoading && (
                  <>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                            <TableCell>{t('dashboard.admin.members.role')}</TableCell>
                            <TableCell>{t('dashboard.admin.members.position')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.played')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.w')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.d')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.l')}</TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.goals')}</TableCell>
                            <TableCell align="right">
                              {t('dashboard.admin.table.assists')}
                            </TableCell>
                            <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                            <TableCell>{t('dashboard.admin.players.actions')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pagedSeasonRoster.map((player) => (
                            <TableRow key={player.player_guid}>
                              <TableCell>{formatPlayerDisplayName(player)}</TableCell>
                              <TableCell>
                                {player.role ? (
                                  <Chip
                                    size="small"
                                    label={player.role}
                                    sx={labelChipSx(penaLabels.role_colors?.[player.role])}
                                  />
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                {player.position ? (
                                  <Chip
                                    size="small"
                                    label={player.position}
                                    sx={labelChipSx(penaLabels.position_colors?.[player.position])}
                                  />
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell align="right">
                                {player.played ?? player.wins + player.draws + player.losses}
                              </TableCell>
                              <TableCell align="right">{player.wins}</TableCell>
                              <TableCell align="right">{player.draws}</TableCell>
                              <TableCell align="right">{player.losses}</TableCell>
                              <TableCell align="right">{player.goals ?? 0}</TableCell>
                              <TableCell align="right">{player.assists ?? 0}</TableCell>
                              <TableCell align="right">{player.points}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => handleEditSeasonPlayer(player)}
                                    disabled={loading}
                                  >
                                    {t('dashboard.admin.players.editSeasonPlayer')}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="error"
                                    onClick={() => handleRequestRemoveSeasonPlayer(player)}
                                    disabled={loading}
                                  >
                                    {t('dashboard.admin.players.removeFromSeason')}
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!seasonRoster.length && (
                            <TableRow>
                              <TableCell colSpan={11}>
                                {t('dashboard.admin.players.noPlayersInSeason')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={seasonRoster.length}
                      page={seasonRosterPage}
                      onPageChange={(_, nextPage) => setSeasonRosterPage(nextPage)}
                      rowsPerPage={seasonRosterRowsPerPage}
                      onRowsPerPageChange={(event) => {
                        setSeasonRosterRowsPerPage(Number(event.target.value))
                        setSeasonRosterPage(0)
                      }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Stack spacing={1.5}>
                <Typography variant="h6">{t('dashboard.admin.members.title')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.members.description')}
                </Typography>
                {!historicalPlayers.length && (
                  <Typography variant="body2" color="text.secondary">
                    {t('dashboard.admin.members.noMembers')}
                  </Typography>
                )}
                {historicalPlayers.length > 0 && (
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <TextField
                        select
                        size="small"
                        label={t('dashboard.admin.members.filterRole')}
                        value={memberFilters.role}
                        onChange={onMemberFilterField('role')}
                        InputLabelProps={{ shrink: true }}
                        SelectProps={{
                          multiple: true,
                          displayEmpty: true,
                          renderValue: (selected) =>
                            renderFilterValue(
                              selected,
                              t('dashboard.admin.members.filterAllRoles')
                            ),
                        }}
                        fullWidth
                      >
                        {penaLabels.role_labels.map((roleLabel) => (
                          <MenuItem key={roleLabel} value={roleLabel.toLowerCase()}>
                            {roleLabel}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label={t('dashboard.admin.members.filterPosition')}
                        value={memberFilters.position}
                        onChange={onMemberFilterField('position')}
                        InputLabelProps={{ shrink: true }}
                        SelectProps={{
                          multiple: true,
                          displayEmpty: true,
                          renderValue: (selected) =>
                            renderFilterValue(
                              selected,
                              t('dashboard.admin.members.filterAllPositions')
                            ),
                        }}
                        fullWidth
                      >
                        {penaLabels.position_labels.map((positionLabel) => (
                          <MenuItem key={positionLabel} value={positionLabel.toLowerCase()}>
                            {positionLabel}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Stack>

                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                            <TableCell>{t('dashboard.admin.members.nickname')}</TableCell>
                            <TableCell>{t('dashboard.admin.members.role')}</TableCell>
                            <TableCell>{t('dashboard.admin.members.position')}</TableCell>
                            <TableCell>{t('dashboard.admin.members.actions')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pagedHistoricalPlayers.map((player) => (
                            <TableRow key={player.guid}>
                              <TableCell>
                                {[player.name, player.surname1, player.surname2]
                                  .filter(Boolean)
                                  .join(' ')}
                              </TableCell>
                              <TableCell>{player.nickname || '-'}</TableCell>
                              <TableCell>
                                {player.role ? (
                                  <Chip
                                    size="small"
                                    label={player.role}
                                    sx={labelChipSx(penaLabels.role_colors?.[player.role])}
                                  />
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                {player.position ? (
                                  <Chip
                                    size="small"
                                    label={player.position}
                                    sx={labelChipSx(penaLabels.position_colors?.[player.position])}
                                  />
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => handleEditMembershipPlayer(player)}
                                    disabled={loading}
                                  >
                                    {t('dashboard.admin.members.edit')}
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="error"
                                    onClick={() => handleRequestRemoveMembershipPlayer(player)}
                                    disabled={loading}
                                  >
                                    {t('dashboard.admin.members.remove')}
                                  </Button>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!filteredHistoricalPlayers.length && (
                            <TableRow>
                              <TableCell colSpan={5}>
                                {t('dashboard.admin.members.noMembersForFilters')}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <TablePagination
                      component="div"
                      count={filteredHistoricalPlayers.length}
                      page={membersPage}
                      onPageChange={(_, nextPage) => setMembersPage(nextPage)}
                      rowsPerPage={membersRowsPerPage}
                      onRowsPerPageChange={(event) => {
                        setMembersRowsPerPage(Number(event.target.value))
                        setMembersPage(0)
                      }}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid item xs={12} xl={4} sx={{ minWidth: 0 }}>
        <Stack spacing={2.5}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">{t('dashboard.admin.guest.title')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.guest.description')}
                </Typography>
                <TextField
                  label={t('dashboard.admin.guest.name')}
                  value={guestForm.name}
                  onChange={onGuestField('name')}
                  fullWidth
                />
                <TextField
                  label={t('dashboard.admin.guest.surname1')}
                  value={guestForm.surname1}
                  onChange={onGuestField('surname1')}
                  fullWidth
                />
                <TextField
                  label={t('dashboard.admin.guest.surname2')}
                  value={guestForm.surname2}
                  onChange={onGuestField('surname2')}
                  fullWidth
                />
                {nationalities.length > 0 ? (
                  <TextField
                    select
                    label={t('dashboard.admin.guest.nationality')}
                    value={guestForm.nationality}
                    onChange={onGuestField('nationality')}
                    fullWidth
                  >
                    {nationalities.map((nationality) => (
                      <MenuItem key={nationality} value={nationality}>
                        {nationality}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <TextField
                    label={t('dashboard.admin.guest.nationality')}
                    value={guestForm.nationality}
                    onChange={onGuestField('nationality')}
                    fullWidth
                  />
                )}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    label={t('dashboard.admin.guest.nickname')}
                    value={guestForm.nickname}
                    onChange={onGuestField('nickname')}
                    fullWidth
                  />
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <TextField
                    select
                    label={t('dashboard.admin.guest.role')}
                    value={guestForm.role}
                    onChange={onGuestField('role')}
                    fullWidth
                  >
                    <MenuItem value="">{t('dashboard.admin.guest.roleNone')}</MenuItem>
                    {penaLabels.role_labels.map((roleLabel) => (
                      <MenuItem key={roleLabel} value={roleLabel}>
                        {roleLabel}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label={t('dashboard.admin.guest.position')}
                    value={guestForm.position}
                    onChange={onGuestField('position')}
                    fullWidth
                  >
                    <MenuItem value="">{t('dashboard.admin.guest.positionNone')}</MenuItem>
                    {penaLabels.position_labels.map((positionLabel) => (
                      <MenuItem key={positionLabel} value={positionLabel}>
                        {positionLabel}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    onClick={() => handleCreateGuestPlayer(false)}
                    disabled={loading}
                  >
                    {t('dashboard.admin.guest.createGuest')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => handleCreateGuestPlayer(true)}
                    disabled={loading || !selectedSeasonGuid}
                  >
                    {t('dashboard.admin.guest.createAndAdd')}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.75}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="h6">{t('dashboard.admin.labels.title')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.admin.labels.currentCounts', {
                        roles: penaLabels.role_labels.length,
                        positions: penaLabels.position_labels.length,
                      })}
                    </Typography>
                  </Box>
                  <Button
                    variant="outlined"
                    onClick={() => setLabelsEditorOpen(true)}
                    disabled={loading}
                  >
                    {t('dashboard.admin.labels.editAction')}
                  </Button>
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.labels.description')}
                </Typography>

                <Stack spacing={1.25}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {t('dashboard.admin.labels.roleLabels')}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.75 }}>
                      {penaLabels.role_labels.map((roleLabel) => (
                        <Chip
                          key={roleLabel}
                          size="small"
                          label={roleLabel}
                          sx={labelChipSx(penaLabels.role_colors?.[roleLabel])}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {t('dashboard.admin.labels.positionLabels')}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.75 }}>
                      {penaLabels.position_labels.map((positionLabel) => (
                        <Chip
                          key={positionLabel}
                          size="small"
                          label={positionLabel}
                          sx={labelChipSx(penaLabels.position_colors?.[positionLabel])}
                        />
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Dialog
        open={labelsEditorOpen}
        onClose={() => setLabelsEditorOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{t('dashboard.admin.labels.title')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.labels.description')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('dashboard.admin.labels.colorHelper')}
            </Typography>

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField
                  label={t('dashboard.admin.labels.roleLabels')}
                  value={labelsDraft.role_labels}
                  onChange={onLabelsDraftField('role_labels')}
                  helperText={t('dashboard.admin.labels.inputHelper')}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <LabelColorList
                  labels={draftRoleLabels}
                  colors={draftRoleColors}
                  onColorChange={(roleLabel) => onLabelColorDraftChange('role_colors', roleLabel)}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label={t('dashboard.admin.labels.positionLabels')}
                  value={labelsDraft.position_labels}
                  onChange={onLabelsDraftField('position_labels')}
                  helperText={t('dashboard.admin.labels.inputHelper')}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <LabelColorList
                  labels={draftPositionLabels}
                  colors={draftPositionColors}
                  onColorChange={(positionLabel) =>
                    onLabelColorDraftChange('position_colors', positionLabel)
                  }
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLabelsEditorOpen(false)}>
            {t('dashboard.common.matchDetail.closeAction')}
          </Button>
          <Button variant="contained" onClick={handleSavePenaLabels} disabled={loading}>
            {t('dashboard.admin.labels.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}
