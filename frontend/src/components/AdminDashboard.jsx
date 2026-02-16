import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { adminService } from '../services/adminService.js'

const todayIso = () => new Date().toISOString().slice(0, 10)

const defaultSeasonForm = () => ({
  start_date: todayIso(),
  end_date: todayIso(),
  points_win: 3,
  points_draw: 1,
  points_loss: 0
})

const defaultMatchForm = () => ({
  match_date: todayIso(),
  home_team_name: 'Home',
  away_team_name: 'Away',
  home_player_guids: '',
  away_player_guids: ''
})

const splitGuids = (value) =>
  value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  const asDate = new Date(`${value}T00:00:00`)
  return asDate.toLocaleDateString()
}

const formatEpochSeconds = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(value * 1000).toLocaleString()
}

export default function AdminDashboard({ session, onLogout }) {
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')

  const [activeSeason, setActiveSeason] = useState(null)
  const [seasonList, setSeasonList] = useState([])
  const [standings, setStandings] = useState([])
  const [tokenPayload, setTokenPayload] = useState(null)
  const [lastCreatedMatch, setLastCreatedMatch] = useState(null)

  const [seasonForm, setSeasonForm] = useState(defaultSeasonForm)
  const [pointsForm, setPointsForm] = useState({
    points_win: 3,
    points_draw: 1,
    points_loss: 0
  })
  const [matchForm, setMatchForm] = useState(defaultMatchForm)

  const historySeasons = useMemo(() => {
    if (!activeSeason) {
      return seasonList
    }
    return seasonList.filter((item) => item.guid !== activeSeason.guid)
  }, [activeSeason, seasonList])

  const onSeasonField = (name) => (event) => {
    const value = name.startsWith('points_') ? Number(event.target.value) : event.target.value
    setSeasonForm((prev) => ({ ...prev, [name]: value }))
  }

  const onPointsField = (name) => (event) => {
    setPointsForm((prev) => ({ ...prev, [name]: Number(event.target.value) }))
  }

  const onMatchField = (name) => (event) => {
    setMatchForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const runAction = async (action, successMessage) => {
    setLoading(true)
    setError(null)
    setNotice('')
    try {
      await action()
      if (successMessage) {
        setNotice(successMessage)
      }
    } catch (actionError) {
      setError(actionError)
    } finally {
      setLoading(false)
    }
  }

  const loadStandings = async (penaGuid, seasonGuid) => {
    const standingsPage = await adminService.listStandings(penaGuid, seasonGuid, { pageSize: 10 })
    setStandings(standingsPage.items || [])
  }

  const loadPenaData = async (penaGuid) => {
    const [active, seasonsPage] = await Promise.all([
      adminService.getActiveSeason(penaGuid).catch((requestError) => {
        if (requestError.status === 404) {
          return null
        }
        throw requestError
      }),
      adminService.listSeasons(penaGuid, { pageSize: 100 })
    ])

    setActiveSeason(active)
    setSeasonList(seasonsPage.items || [])

    if (active) {
      setPointsForm({
        points_win: active.points_win,
        points_draw: active.points_draw,
        points_loss: active.points_loss
      })
      await loadStandings(penaGuid, active.guid)
    } else {
      setStandings([])
    }
  }

  const loadDashboard = async () => {
    setInitializing(true)
    setError(null)
    try {
      const penaPage = await adminService.getPenas({ pageSize: 50 })
      const penaItems = penaPage.items || []
      setPenas(penaItems)

      const defaultPena = selectedPenaGuid || penaItems[0]?.guid || ''
      setSelectedPenaGuid(defaultPena)

      if (defaultPena) {
        await loadPenaData(defaultPena)
      } else {
        setActiveSeason(null)
        setSeasonList([])
        setStandings([])
      }
    } catch (requestError) {
      setError(requestError)
    } finally {
      setInitializing(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedPenaGuid || initializing) {
      return
    }
    runAction(
      () => loadPenaData(selectedPenaGuid),
      ''
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid])

  const handleCreateSeason = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      await adminService.createSeason(selectedPenaGuid, seasonForm)
      await loadPenaData(selectedPenaGuid)
    }, 'Season created')
  }

  const handleUpdateSeasonPoints = async () => {
    if (!selectedPenaGuid || !activeSeason) {
      return
    }
    await runAction(async () => {
      await adminService.updateSeason(selectedPenaGuid, activeSeason.guid, pointsForm)
      await loadPenaData(selectedPenaGuid)
    }, 'Season points updated')
  }

  const handleCreateDetailedMatch = async () => {
    if (!selectedPenaGuid || !activeSeason) {
      return
    }
    const homeLineup = splitGuids(matchForm.home_player_guids)
    const awayLineup = splitGuids(matchForm.away_player_guids)
    if (!homeLineup.length || !awayLineup.length) {
      setError(new Error('Home and away lineups must include at least one player guid'))
      return
    }
    await runAction(async () => {
      const created = await adminService.createDetailedMatch(selectedPenaGuid, activeSeason.guid, {
        match_date: matchForm.match_date,
        home_team: {
          team_name: matchForm.home_team_name,
          player_guids: homeLineup
        },
        away_team: {
          team_name: matchForm.away_team_name,
          player_guids: awayLineup
        }
      })
      setLastCreatedMatch(created)
      await loadPenaData(selectedPenaGuid)
    }, 'Detailed match created')
  }

  const handleGenerateJoinCode = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const token = await adminService.createLinkToken(selectedPenaGuid)
      setTokenPayload(token)
    }, 'Join code generated')
  }

  if (initializing) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Admin Panel</Typography>
        <LinearProgress />
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4">Admin Panel</Typography>
              <Typography variant="body2" color="text.secondary">
                Logged as <strong>{session?.user_guid || '-'}</strong>
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                select
                size="small"
                label="Pena"
                value={selectedPenaGuid}
                onChange={(event) => setSelectedPenaGuid(event.target.value)}
                sx={{ minWidth: 320 }}
              >
                {penas.map((pena) => (
                  <MenuItem key={pena.guid} value={pena.guid}>
                    {pena.name}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={() => runAction(loadDashboard, '')} disabled={loading}>
                Refresh
              </Button>
              <Button variant="text" onClick={onLogout} disabled={loading}>
                Logout
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{error.message}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      {!selectedPenaGuid && (
        <Alert severity="info">
          This admin is not linked to any pena yet. Create or assign a pena first.
        </Alert>
      )}

      {selectedPenaGuid && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Stack spacing={2.5}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="h6">Current Season</Typography>
                    {activeSeason && (
                      <Chip
                        size="small"
                        color="secondary"
                        label={`${formatDate(activeSeason.start_date)} - ${formatDate(activeSeason.end_date)}`}
                      />
                    )}
                  </Stack>

                  {!activeSeason && (
                    <Alert severity="warning">
                      No active season found for today. Create one to start match orchestration.
                    </Alert>
                  )}

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="date"
                      label="Start date"
                      InputLabelProps={{ shrink: true }}
                      value={seasonForm.start_date}
                      onChange={onSeasonField('start_date')}
                      fullWidth
                    />
                    <TextField
                      type="date"
                      label="End date"
                      InputLabelProps={{ shrink: true }}
                      value={seasonForm.end_date}
                      onChange={onSeasonField('end_date')}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="number"
                      label="Win points"
                      value={seasonForm.points_win}
                      onChange={onSeasonField('points_win')}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label="Draw points"
                      value={seasonForm.points_draw}
                      onChange={onSeasonField('points_draw')}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label="Loss points"
                      value={seasonForm.points_loss}
                      onChange={onSeasonField('points_loss')}
                      fullWidth
                    />
                  </Stack>
                  <Button
                    variant="contained"
                    onClick={handleCreateSeason}
                    disabled={loading || Boolean(activeSeason)}
                  >
                    Create Active Season
                  </Button>

                  <Divider />

                  <Typography variant="subtitle1">Season Scoring Rules</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="number"
                      label="Win points"
                      value={pointsForm.points_win}
                      onChange={onPointsField('points_win')}
                      fullWidth
                      disabled={!activeSeason}
                    />
                    <TextField
                      type="number"
                      label="Draw points"
                      value={pointsForm.points_draw}
                      onChange={onPointsField('points_draw')}
                      fullWidth
                      disabled={!activeSeason}
                    />
                    <TextField
                      type="number"
                      label="Loss points"
                      value={pointsForm.points_loss}
                      onChange={onPointsField('points_loss')}
                      fullWidth
                      disabled={!activeSeason}
                    />
                  </Stack>
                  <Button
                    variant="outlined"
                    onClick={handleUpdateSeasonPoints}
                    disabled={loading || !activeSeason}
                  >
                    Save Scoring Rules
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Invite Players</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generate a one-time join token to share with users.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={handleGenerateJoinCode}
                    disabled={loading}
                  >
                    Generate Join Code
                  </Button>
                  {tokenPayload && (
                    <Alert severity="info">
                      <Typography variant="body2">
                        <strong>Code:</strong> {tokenPayload.token}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Expires:</strong> {formatEpochSeconds(tokenPayload.expires_at)}
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={7}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Create Match + Lineups</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a detailed season match and start the lineup process in one action.
                  </Typography>
                  <TextField
                    type="date"
                    label="Match date"
                    InputLabelProps={{ shrink: true }}
                    value={matchForm.match_date}
                    onChange={onMatchField('match_date')}
                    disabled={!activeSeason}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      label="Home team name"
                      value={matchForm.home_team_name}
                      onChange={onMatchField('home_team_name')}
                      disabled={!activeSeason}
                      fullWidth
                    />
                    <TextField
                      label="Away team name"
                      value={matchForm.away_team_name}
                      onChange={onMatchField('away_team_name')}
                      disabled={!activeSeason}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Home lineup guids"
                    value={matchForm.home_player_guids}
                    onChange={onMatchField('home_player_guids')}
                    disabled={!activeSeason}
                    multiline
                    minRows={3}
                    helperText="Comma or line-break separated player GUIDs"
                  />
                  <TextField
                    label="Away lineup guids"
                    value={matchForm.away_player_guids}
                    onChange={onMatchField('away_player_guids')}
                    disabled={!activeSeason}
                    multiline
                    minRows={3}
                    helperText="Comma or line-break separated player GUIDs"
                  />
                  <Button
                    variant="contained"
                    onClick={handleCreateDetailedMatch}
                    disabled={loading || !activeSeason}
                  >
                    Create Detailed Match
                  </Button>
                  {lastCreatedMatch && (
                    <Alert severity="success">
                      Match <strong>{lastCreatedMatch.guid}</strong> created for{' '}
                      <strong>{formatDate(lastCreatedMatch.match_date)}</strong>.
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={5}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Current Standings</Typography>
                  {!activeSeason && (
                    <Typography variant="body2" color="text.secondary">
                      Standings will appear once the active season exists.
                    </Typography>
                  )}
                  {activeSeason && (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Player</TableCell>
                          <TableCell align="right">W</TableCell>
                          <TableCell align="right">D</TableCell>
                          <TableCell align="right">L</TableCell>
                          <TableCell align="right">Pts</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {standings.map((player) => (
                          <TableRow key={player.player_guid}>
                            <TableCell>{player.nickname || `${player.name} ${player.surname1}`}</TableCell>
                            <TableCell align="right">{player.wins}</TableCell>
                            <TableCell align="right">{player.draws}</TableCell>
                            <TableCell align="right">{player.losses}</TableCell>
                            <TableCell align="right">{player.points}</TableCell>
                          </TableRow>
                        ))}
                        {!standings.length && (
                          <TableRow>
                            <TableCell colSpan={5}>No season players registered yet.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">Previous Seasons</Typography>
                  {!historySeasons.length && (
                    <Typography variant="body2" color="text.secondary">
                      No previous seasons found.
                    </Typography>
                  )}
                  <Stack spacing={1}>
                    {historySeasons.map((season) => (
                      <Box
                        key={season.guid}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: 'rgba(17, 24, 39, 0.04)'
                        }}
                      >
                        <Typography variant="body2">
                          {formatDate(season.start_date)} - {formatDate(season.end_date)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          W:{season.points_win} / D:{season.points_draw} / L:{season.points_loss}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Stack>
  )
}
