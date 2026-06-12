import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import LineupDragBuilder from '../../LineupDragBuilder.jsx'
import DateField from '../../common/DateField.jsx'

const toIsoDate = (date) => {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// Next occurrence of a weekday (0=Sunday..6=Saturday), today excluded.
const nextWeekday = (date, weekday) => {
  const delta = (weekday - date.getDay() + 7) % 7 || 7
  return addDays(date, delta)
}

const buildQuickDates = (t) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return [
    { key: 'today', label: t('dashboard.admin.matches.dateQuickToday'), iso: toIsoDate(today) },
    {
      key: 'tomorrow',
      label: t('dashboard.admin.matches.dateQuickTomorrow'),
      iso: toIsoDate(addDays(today, 1)),
    },
    {
      key: 'saturday',
      label: t('dashboard.admin.matches.dateQuickSaturday'),
      iso: toIsoDate(nextWeekday(today, 6)),
    },
    {
      key: 'sunday',
      label: t('dashboard.admin.matches.dateQuickSunday'),
      iso: toIsoDate(nextWeekday(today, 0)),
    },
  ]
}

const isWithinRange = (iso, minIso, maxIso) =>
  (!minIso || iso >= minIso) && (!maxIso || iso <= maxIso)

/**
 * "Create detailed match" card: date + team names + drag-and-drop lineups.
 * Extracted from AdminMatchesSection; state stays in the dashboard and arrives
 * through the same state/actions/helpers bundles.
 */
export default function MatchCreateCard({ state, actions, helpers }) {
  const {
    selectedSeasonGuid,
    selectedSeason,
    seasonRosterLoading,
    seasonRoster,
    createMatchLineupPlayers,
    matchFormHomeGuids,
    matchFormAwayGuids,
    matchForm,
    loading,
    lastCreatedMatch,
  } = state
  const { onMatchField, onMatchFormLineupsChange, handleCreateDetailedMatch } = actions
  const { t, formatDate } = helpers

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">{t('dashboard.admin.matches.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.matches.description')}
          </Typography>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'center' }}
          >
            <DateField
              label={t('dashboard.admin.matches.matchDate')}
              value={matchForm.match_date}
              onChange={(iso) => onMatchField('match_date')({ target: { value: iso } })}
              minIso={selectedSeason?.start_date || ''}
              maxIso={selectedSeason?.end_date || ''}
              disabled={!selectedSeasonGuid}
              helperText={
                selectedSeason
                  ? t('dashboard.admin.matches.dateWithinSeason', {
                      start: formatDate(selectedSeason.start_date),
                      end: formatDate(selectedSeason.end_date),
                    })
                  : ' '
              }
              sx={{ width: { xs: '100%', sm: 280 } }}
            />
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              rowGap={1}
              sx={{ pb: { md: 2.5 } }}
            >
              {buildQuickDates(t)
                .filter((quick) =>
                  isWithinRange(quick.iso, selectedSeason?.start_date, selectedSeason?.end_date)
                )
                .map((quick) => (
                  <Chip
                    key={quick.key}
                    label={quick.label}
                    size="small"
                    variant={matchForm.match_date === quick.iso ? 'filled' : 'outlined'}
                    color={matchForm.match_date === quick.iso ? 'secondary' : 'default'}
                    disabled={!selectedSeasonGuid}
                    onClick={() => onMatchField('match_date')({ target: { value: quick.iso } })}
                  />
                ))}
            </Stack>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label={t('dashboard.admin.matches.homeTeam')}
              value={matchForm.home_team_name}
              onChange={onMatchField('home_team_name')}
              placeholder={t('dashboard.admin.matches.homeTeamPlaceholder')}
              disabled={!selectedSeasonGuid}
              fullWidth
            />
            <TextField
              label={t('dashboard.admin.matches.awayTeam')}
              value={matchForm.away_team_name}
              onChange={onMatchField('away_team_name')}
              placeholder={t('dashboard.admin.matches.awayTeamPlaceholder')}
              disabled={!selectedSeasonGuid}
              fullWidth
            />
          </Stack>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('dashboard.admin.matches.lineupHelperTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.matches.lineupHelperDescription')}
          </Typography>
          {!selectedSeasonGuid && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.matches.lineupHelperSelectSeason')}
            </Typography>
          )}
          {selectedSeasonGuid && seasonRosterLoading && <LinearProgress />}
          {selectedSeasonGuid && !seasonRosterLoading && !seasonRoster.length && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.matches.noPlayersAvailable')}
            </Typography>
          )}
          {selectedSeasonGuid && !seasonRosterLoading && seasonRoster.length > 0 && (
            <LineupDragBuilder
              players={createMatchLineupPlayers}
              homeGuids={matchFormHomeGuids}
              awayGuids={matchFormAwayGuids}
              onChange={onMatchFormLineupsChange}
              availableTitle={t('dashboard.admin.matches.availablePlayers')}
              homeTitle={matchForm.home_team_name || t('dashboard.admin.matches.homeLineup')}
              awayTitle={matchForm.away_team_name || t('dashboard.admin.matches.awayLineup')}
              helperText={t('dashboard.admin.matches.lineupBoardHint')}
              emptyText={t('dashboard.admin.matches.lineupEmpty')}
              addHomeText={t('dashboard.admin.matches.addToHome')}
              addAwayText={t('dashboard.admin.matches.addToAway')}
              moveHomeText={t('dashboard.admin.matches.moveToHome')}
              moveAwayText={t('dashboard.admin.matches.moveToAway')}
              removeText={t('dashboard.admin.matches.removeFromLineup')}
              disabled={loading || !selectedSeasonGuid}
            />
          )}
          <Button
            variant="contained"
            onClick={handleCreateDetailedMatch}
            disabled={loading || !selectedSeasonGuid}
          >
            {t('dashboard.admin.matches.createDetailedMatch')}
          </Button>
          {lastCreatedMatch && (
            <Alert severity="success">
              {t('dashboard.admin.matches.matchCreated', {
                guid: lastCreatedMatch.guid,
                date: formatDate(lastCreatedMatch.match_date),
              })}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
