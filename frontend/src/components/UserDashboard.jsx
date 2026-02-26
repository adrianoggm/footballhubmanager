import {
  Alert,
  Box,
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
  Typography
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n/useI18n.js'
import { userService } from '../services/userService.js'

const defaultProfileForm = () => ({
  name: '',
  surname1: '',
  surname2: '',
  nationality: ''
})

const defaultJoinForm = () => ({
  token: '',
  nickname: '',
  position: ''
})

const defaultMembershipForm = () => ({
  nickname: '',
  position: ''
})

const asText = (value) => value ?? ''

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

const mapDashboardErrorMessage = (error, t) => {
  const raw = String(error?.message || '').toLowerCase()
  if (!raw) {
    return t('dashboard.common.errors.generic')
  }
  if (error?.status === 403 || raw.includes('forbidden')) {
    return t('dashboard.common.errors.forbidden')
  }
  if (raw.includes('failed to fetch') || raw.includes('network')) {
    return t('dashboard.common.errors.network')
  }
  return error.message
}

export default function UserDashboard({ session, onLogout }) {
  const { t } = useI18n()
  const [initializing, setInitializing] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')

  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState(defaultProfileForm)
  const [nationalities, setNationalities] = useState([])

  const [penas, setPenas] = useState([])
  const [selectedPenaGuid, setSelectedPenaGuid] = useState('')
  const [membership, setMembership] = useState(null)
  const [membershipForm, setMembershipForm] = useState(defaultMembershipForm)
  const [joinForm, setJoinForm] = useState(defaultJoinForm)
  const [seasonList, setSeasonList] = useState([])
  const [selectedSeasonGuid, setSelectedSeasonGuid] = useState('')
  const [standings, setStandings] = useState([])
  const [seasonMatches, setSeasonMatches] = useState([])
  const [seasonDataLoading, setSeasonDataLoading] = useState(false)
  const seasonListRequestIdRef = useRef(0)
  const seasonDataRequestIdRef = useRef(0)

  const selectedPena = useMemo(
    () => penas.find((item) => item.guid === selectedPenaGuid) || null,
    [penas, selectedPenaGuid]
  )

  const selectedSeason = useMemo(
    () => seasonList.find((item) => item.guid === selectedSeasonGuid) || null,
    [seasonList, selectedSeasonGuid]
  )

  const errorMessage = useMemo(
    () => (error ? mapDashboardErrorMessage(error, t) : ''),
    [error, t]
  )

  const runAction = async (action, successMessage = '') => {
    setLoading(true)
    setError(null)
    setNotice('')
    try {
      await action()
      if (successMessage) {
        setNotice(successMessage)
      }
    } catch (actionError) {
      if (actionError?.status === 401) {
        await onLogout()
        return
      }
      setError(actionError)
    } finally {
      setLoading(false)
    }
  }

  const loadMembership = async (penaGuid) => {
    if (!penaGuid) {
      setMembership(null)
      setMembershipForm(defaultMembershipForm())
      return
    }
    try {
      const currentMembership = await userService.getMyMembership(penaGuid)
      setMembership(currentMembership)
      setMembershipForm({
        nickname: asText(currentMembership.nickname),
        position: asText(currentMembership.position)
      })
    } catch (requestError) {
      if (requestError.status === 403 || requestError.status === 404) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        return
      }
      throw requestError
    }
  }

  const loadSeasonList = async (penaGuid) => {
    const requestId = seasonListRequestIdRef.current + 1
    seasonListRequestIdRef.current = requestId
    const isStale = () => requestId !== seasonListRequestIdRef.current

    if (!penaGuid) {
      if (isStale()) {
        return
      }
      setSeasonList([])
      setSelectedSeasonGuid('')
      return
    }

    const [activeSeason, seasonsPage] = await Promise.all([
      userService.getActiveSeason(penaGuid).catch((requestError) => {
        if (requestError?.status === 404) {
          return null
        }
        throw requestError
      }),
      userService.listSeasons(penaGuid, { pageSize: 100 })
    ])
    if (isStale()) {
      return
    }

    const seasonItems = seasonsPage.items || []
    setSeasonList(seasonItems)
    const resolvedSeasonGuid =
      seasonItems.some((item) => item.guid === selectedSeasonGuid)
        ? selectedSeasonGuid
        : activeSeason?.guid || seasonItems[0]?.guid || ''
    setSelectedSeasonGuid(resolvedSeasonGuid)
  }

  const loadSeasonData = async (penaGuid, seasonGuid) => {
    const requestId = seasonDataRequestIdRef.current + 1
    seasonDataRequestIdRef.current = requestId
    const isStale = () => requestId !== seasonDataRequestIdRef.current

    if (!seasonGuid) {
      if (isStale()) {
        return
      }
      setStandings([])
      setSeasonMatches([])
      return
    }

    const [standingsPage, matchesPage] = await Promise.all([
      userService.listStandings(penaGuid, seasonGuid, { pageSize: 20 }),
      userService.listSeasonMatches(penaGuid, seasonGuid, { pageSize: 100 })
    ])
    if (isStale()) {
      return
    }
    setStandings(standingsPage.items || [])
    setSeasonMatches(matchesPage.items || [])
  }

  const loadDashboard = async () => {
    setInitializing(true)
    setError(null)
    try {
      const [nextProfile, penasPage, nextNationalities] = await Promise.all([
        userService.getMyProfile(),
        userService.listMyPenas(),
        userService.getNationalities().catch(() => [])
      ])
      const nextPenas = penasPage.items || []
      setProfile(nextProfile)
      setProfileForm({
        name: asText(nextProfile.name),
        surname1: asText(nextProfile.surname1),
        surname2: asText(nextProfile.surname2),
        nationality: asText(nextProfile.nationality)
      })
      setPenas(nextPenas)
      setNationalities(nextNationalities)

      const preferredPena =
        nextPenas.find((item) => item.guid === selectedPenaGuid)?.guid || nextPenas[0]?.guid || ''
      setSelectedPenaGuid(preferredPena)
      if (preferredPena) {
        await Promise.all([
          loadMembership(preferredPena),
          loadSeasonList(preferredPena)
        ])
      } else {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        setSeasonList([])
        setSelectedSeasonGuid('')
        setStandings([])
        setSeasonMatches([])
      }
    } catch (requestError) {
      if (requestError?.status === 401) {
        await onLogout()
        return
      }
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
      if (!selectedPenaGuid) {
        setMembership(null)
        setMembershipForm(defaultMembershipForm())
        setSeasonList([])
        setSelectedSeasonGuid('')
        setStandings([])
        setSeasonMatches([])
      }
      return
    }
    runAction(async () => {
      await Promise.all([
        loadMembership(selectedPenaGuid),
        loadSeasonList(selectedPenaGuid)
      ])
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid])

  useEffect(() => {
    if (!selectedPenaGuid || !selectedSeasonGuid || initializing) {
      if (!selectedSeasonGuid) {
        setStandings([])
        setSeasonMatches([])
      }
      setSeasonDataLoading(false)
      return
    }

    let activeRequest = true
    setSeasonDataLoading(true)
    ;(async () => {
      try {
        await loadSeasonData(selectedPenaGuid, selectedSeasonGuid)
      } catch (requestError) {
        if (!activeRequest) {
          return
        }
        if (requestError?.status === 401) {
          await onLogout()
          return
        }
        setError(requestError)
      } finally {
        if (activeRequest) {
          setSeasonDataLoading(false)
        }
      }
    })()

    return () => {
      activeRequest = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPenaGuid, selectedSeasonGuid, initializing])

  const onProfileField = (name) => (event) => {
    setProfileForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onMembershipField = (name) => (event) => {
    setMembershipForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const onJoinField = (name) => (event) => {
    setJoinForm((prev) => ({ ...prev, [name]: event.target.value }))
  }

  const handleUpdateProfile = async () => {
    await runAction(async () => {
      const updatedProfile = await userService.updateMyProfile(profileForm)
      setProfile(updatedProfile)
      setProfileForm({
        name: asText(updatedProfile.name),
        surname1: asText(updatedProfile.surname1),
        surname2: asText(updatedProfile.surname2),
        nationality: asText(updatedProfile.nationality)
      })
    }, t('dashboard.user.noticeProfileUpdated'))
  }

  const handleJoinPena = async () => {
    const token = joinForm.token.trim()
    if (!token) {
      setError(new Error(t('dashboard.user.errorInviteRequired')))
      return
    }
    await runAction(async () => {
      await userService.consumeJoinToken({
        token,
        nickname: joinForm.nickname.trim() || null,
        position: joinForm.position.trim() || null
      })
      setJoinForm(defaultJoinForm())
      await loadDashboard()
    }, t('dashboard.user.noticeJoinedPena'))
  }

  const handleUpdateMembership = async () => {
    if (!selectedPenaGuid) {
      return
    }
    await runAction(async () => {
      const updatedMembership = await userService.updateMyMembership(selectedPenaGuid, {
        nickname: membershipForm.nickname.trim() || null,
        position: membershipForm.position.trim() || null
      })
      setMembership(updatedMembership)
      setMembershipForm({
        nickname: asText(updatedMembership.nickname),
        position: asText(updatedMembership.position)
      })
    }, t('dashboard.user.noticeMembershipUpdated'))
  }

  const handleLeavePena = async () => {
    if (!selectedPenaGuid) {
      return
    }
    const confirmed = window.confirm(t('dashboard.user.confirmLeave'))
    if (!confirmed) {
      return
    }
    await runAction(async () => {
      await userService.leavePena(selectedPenaGuid)
      await loadDashboard()
    }, t('dashboard.user.noticeLeftPena'))
  }

  if (initializing) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">{t('dashboard.user.loadingTitle')}</Typography>
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
              <Typography variant="h4">{t('dashboard.user.panelTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.common.loggedAs')} <strong>{session?.user_guid || '-'}</strong>
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button variant="outlined" onClick={() => runAction(loadDashboard)} disabled={loading}>
                {t('dashboard.common.refresh')}
              </Button>
              <Button variant="text" onClick={onLogout} disabled={loading}>
                {t('dashboard.common.logout')}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {loading && <LinearProgress />}
      {error && <Alert severity="error">{errorMessage}</Alert>}
      {notice && <Alert severity="success">{notice}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">{t('dashboard.user.profileTitle')}</Typography>
                <TextField
                  label={t('dashboard.user.fields.name')}
                  value={profileForm.name}
                  onChange={onProfileField('name')}
                />
                <TextField
                  label={t('dashboard.user.fields.surname1')}
                  value={profileForm.surname1}
                  onChange={onProfileField('surname1')}
                />
                <TextField
                  label={t('dashboard.user.fields.surname2')}
                  value={profileForm.surname2}
                  onChange={onProfileField('surname2')}
                />
                <TextField
                  select
                  label={t('dashboard.user.fields.nationality')}
                  value={profileForm.nationality}
                  onChange={onProfileField('nationality')}
                >
                  {nationalities.map((nationality) => (
                    <MenuItem key={nationality} value={nationality}>
                      {nationality}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" onClick={handleUpdateProfile} disabled={loading}>
                  {t('dashboard.user.saveProfile')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">{t('dashboard.user.joinTitle')}</Typography>
                <TextField
                  label={t('dashboard.user.inviteCode')}
                  value={joinForm.token}
                  onChange={onJoinField('token')}
                  placeholder={t('dashboard.user.invitePlaceholder')}
                />
                <TextField
                  label={t('dashboard.user.nicknameOptional')}
                  value={joinForm.nickname}
                  onChange={onJoinField('nickname')}
                />
                <TextField
                  label={t('dashboard.user.positionOptional')}
                  value={joinForm.position}
                  onChange={onJoinField('position')}
                />
                <Button variant="contained" onClick={handleJoinPena} disabled={loading}>
                  {t('dashboard.user.join')}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6">{t('dashboard.user.myPenasTitle')}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.user.linkedCount', {
                    count: penas.length,
                    suffix: penas.length === 1 ? '' : 's'
                  })}
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                label={t('dashboard.user.selectedPena')}
                value={selectedPenaGuid}
                onChange={(event) => setSelectedPenaGuid(event.target.value)}
                sx={{ minWidth: 280 }}
              >
                {penas.map((pena) => (
                  <MenuItem key={pena.guid} value={pena.guid}>
                    {pena.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {penas.map((pena) => (
                <Chip
                  key={pena.guid}
                  label={pena.name}
                  color={pena.guid === selectedPenaGuid ? 'secondary' : 'default'}
                  variant={pena.guid === selectedPenaGuid ? 'filled' : 'outlined'}
                />
              ))}
              {!penas.length && <Chip label={t('dashboard.user.noPenasLinked')} />}
            </Stack>

            {selectedPena && (
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {t('dashboard.user.membershipIn', { name: selectedPena.name })}
                      </Typography>
                    <TextField
                      label={t('dashboard.user.nickname')}
                      value={membershipForm.nickname}
                      onChange={onMembershipField('nickname')}
                    />
                    <TextField
                      label={t('dashboard.user.position')}
                      value={membershipForm.position}
                      onChange={onMembershipField('position')}
                    />
                    {membership?.role && (
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.user.role', { role: membership.role })}
                      </Typography>
                    )}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                      <Button
                        variant="contained"
                        onClick={handleUpdateMembership}
                        disabled={loading}
                      >
                        {t('dashboard.user.saveMembership')}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleLeavePena}
                        disabled={loading}
                      >
                        {t('dashboard.user.leavePena')}
                      </Button>
                    </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {t('dashboard.user.leaveHint')}
                      </Typography>

                      <TextField
                        select
                        size="small"
                        label={t('dashboard.user.selectedSeason')}
                        value={selectedSeasonGuid}
                        onChange={(event) => setSelectedSeasonGuid(event.target.value)}
                        disabled={!seasonList.length || loading}
                        fullWidth
                      >
                        {seasonList.map((season) => (
                          <MenuItem key={season.guid} value={season.guid}>
                            {formatDate(season.start_date)} - {formatDate(season.end_date)}
                          </MenuItem>
                        ))}
                      </TextField>

                      {!seasonList.length && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.user.noSeasonsAvailable')}
                        </Typography>
                      )}

                      {selectedSeason && (
                        <Typography variant="body2" color="text.secondary">
                          {t('dashboard.user.statsReadOnlyHint', {
                            season: `${formatDate(selectedSeason.start_date)} - ${formatDate(selectedSeason.end_date)}`
                          })}
                        </Typography>
                      )}

                      {seasonDataLoading && <LinearProgress />}

                      {selectedSeasonGuid && !seasonDataLoading && (
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                              <CardContent>
                                <Stack spacing={1.5}>
                                  <Typography variant="subtitle2">
                                    {t('dashboard.user.standingsTitle')}
                                  </Typography>
                                  {!standings.length && (
                                    <Typography variant="body2" color="text.secondary">
                                      {t('dashboard.user.noStandingsForSeason')}
                                    </Typography>
                                  )}
                                  {standings.length > 0 && (
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>{t('dashboard.user.table.player')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.played')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.w')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.d')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.l')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.goals')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.assists')}</TableCell>
                                            <TableCell align="right">{t('dashboard.user.table.pts')}</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {standings.map((player) => (
                                            <TableRow key={player.player_guid}>
                                              <TableCell>{player.nickname || `${player.name} ${player.surname1}`}</TableCell>
                                              <TableCell align="right">
                                                {player.played ?? player.wins + player.draws + player.losses}
                                              </TableCell>
                                              <TableCell align="right">{player.wins}</TableCell>
                                              <TableCell align="right">{player.draws}</TableCell>
                                              <TableCell align="right">{player.losses}</TableCell>
                                              <TableCell align="right">{player.goals ?? 0}</TableCell>
                                              <TableCell align="right">{player.assists ?? 0}</TableCell>
                                              <TableCell align="right">{player.points}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>

                          <Grid item xs={12} md={6}>
                            <Card variant="outlined">
                              <CardContent>
                                <Stack spacing={1.5}>
                                  <Typography variant="subtitle2">
                                    {t('dashboard.user.matchesTitle')}
                                  </Typography>
                                  {!seasonMatches.length && (
                                    <Typography variant="body2" color="text.secondary">
                                      {t('dashboard.user.noMatchesForSeason')}
                                    </Typography>
                                  )}
                                  {seasonMatches.length > 0 && (
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell>{t('dashboard.user.table.date')}</TableCell>
                                            <TableCell>{t('dashboard.user.table.home')}</TableCell>
                                            <TableCell>{t('dashboard.user.table.away')}</TableCell>
                                            <TableCell>{t('dashboard.user.table.status')}</TableCell>
                                            <TableCell>{t('dashboard.user.table.result')}</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {seasonMatches.map((match) => (
                                            <TableRow key={match.guid}>
                                              <TableCell>{formatDate(match.match_date)}</TableCell>
                                              <TableCell>{match.home_team_name}</TableCell>
                                              <TableCell>{match.away_team_name}</TableCell>
                                              <TableCell>
                                                {String(match.status || '').toLowerCase() === 'closed'
                                                  ? t('dashboard.user.statusClosed')
                                                  : t('dashboard.user.statusOpen')}
                                              </TableCell>
                                              <TableCell>{match.home_score} - {match.away_score}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        </Grid>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
            )}
          </Stack>
        </CardContent>
      </Card>

      {profile && (
        <Alert severity="info">
          {t('dashboard.user.playerGuid', { guid: profile.guid })}
        </Alert>
      )}
    </Stack>
  )
}
