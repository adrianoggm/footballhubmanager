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
  } = actions

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
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
                          <TableCell colSpan={9}>
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
      </Grid>

      <Grid item xs={12} md={4}>
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
                  <TextField
                    label={t('dashboard.admin.guest.position')}
                    value={guestForm.position}
                    onChange={onGuestField('position')}
                    fullWidth
                  />
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
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('dashboard.admin.table.player')}</TableCell>
                          <TableCell>{t('dashboard.admin.members.nickname')}</TableCell>
                          <TableCell>{t('dashboard.admin.members.position')}</TableCell>
                          <TableCell>{t('dashboard.admin.members.actions')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {historicalPlayers.map((player) => (
                          <TableRow key={player.guid}>
                            <TableCell>
                              {[player.name, player.surname1, player.surname2]
                                .filter(Boolean)
                                .join(' ')}
                            </TableCell>
                            <TableCell>{player.nickname || '-'}</TableCell>
                            <TableCell>{player.position || '-'}</TableCell>
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
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  )
}
