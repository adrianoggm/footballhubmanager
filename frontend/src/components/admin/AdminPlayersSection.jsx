import {
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

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

                <TextField
                  select
                  label={t('dashboard.admin.players.historicalMembersLabel')}
                  value={selectedHistoricalGuids}
                  onChange={handleSelectHistoricalPlayers}
                  SelectProps={{
                    multiple: true,
                    renderValue: (selected) =>
                      t('dashboard.admin.players.selectedCount', {
                        count: selected.length,
                      }),
                  }}
                  disabled={loading || !selectedSeasonGuid || !availableHistoricalPlayers.length}
                  helperText={
                    !selectedSeasonGuid
                      ? t('dashboard.admin.players.helperSelectSeason')
                      : availableHistoricalPlayers.length
                        ? t('dashboard.admin.players.helperSome')
                        : t('dashboard.admin.players.helperNone')
                  }
                  fullWidth
                >
                  {availableHistoricalPlayers.map((player) => (
                    <MenuItem key={player.guid} value={player.guid}>
                      {formatPlayerDisplayName(player)}
                    </MenuItem>
                  ))}
                </TextField>

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
                          <TableCell align="right">{t('dashboard.admin.table.assists')}</TableCell>
                          <TableCell align="right">{t('dashboard.admin.table.pts')}</TableCell>
                          <TableCell>{t('dashboard.admin.players.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {seasonRoster.map((player) => (
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
                              <Stack direction="row" spacing={1}>
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
                          {filteredHistoricalPlayers.map((player) => (
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
                                <Stack direction="row" spacing={1}>
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
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>

      <Grid item xs={12} md={4}>
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
      </Grid>
    </Grid>
  )
}
