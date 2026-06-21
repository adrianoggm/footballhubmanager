import {
  Box,
  Button,
  Collapse,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

const MATCH_EVENT_TYPES = [
  'goal',
  'assist',
  'save',
  'foul',
  'yellow_card',
  'red_card',
  'sanction',
  'other',
]

const MATCH_EVENT_TYPES_WITH_OPTIONAL_PLAYER = new Set(['other'])

export default function ManualEventForm({
  show,
  onToggle,
  matchEventDraft,
  onMatchEventDraftField,
  handleCreateMatchEvent,
  primaryEventPlayers,
  relatedEventPlayers,
  loading,
  matchStatsLoading,
  t,
}) {
  return (
    <>
      <Divider />

      <Button variant="text" size="small" onClick={onToggle} sx={{ alignSelf: 'flex-start' }}>
        {show
          ? t('dashboard.admin.matches.manualEventHide')
          : t('dashboard.admin.matches.manualEventShow')}
      </Button>

      <Collapse in={show}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('dashboard.admin.matches.manualEventTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.matches.manualEventDescription')}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label={t('dashboard.admin.matches.eventType')}
                value={matchEventDraft?.event_type || 'goal'}
                onChange={onMatchEventDraftField('event_type')}
              >
                {MATCH_EVENT_TYPES.map((eventType) => (
                  <MenuItem key={eventType} value={eventType}>
                    {t(`dashboard.admin.matches.eventTypes.${eventType}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label={t('dashboard.admin.matches.teamSide')}
                value={matchEventDraft?.team_side || 'home'}
                onChange={onMatchEventDraftField('team_side')}
              >
                {['home', 'away', 'neutral'].map((teamSide) => (
                  <MenuItem key={teamSide} value={teamSide}>
                    {t(`dashboard.admin.matches.teamSides.${teamSide}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label={t('dashboard.admin.matches.eventAction')}
                value={matchEventDraft?.value_delta || '1'}
                onChange={onMatchEventDraftField('value_delta')}
              >
                <MenuItem value="1">{t('dashboard.admin.matches.eventDeltaAdd')}</MenuItem>
                <MenuItem value="-1">{t('dashboard.admin.matches.eventDeltaSubtract')}</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label={t('dashboard.admin.matches.eventPlayer')}
                value={matchEventDraft?.player_guid || ''}
                onChange={onMatchEventDraftField('player_guid')}
                disabled={
                  !primaryEventPlayers.length &&
                  !MATCH_EVENT_TYPES_WITH_OPTIONAL_PLAYER.has(matchEventDraft?.event_type || '')
                }
              >
                <MenuItem value="">
                  {MATCH_EVENT_TYPES_WITH_OPTIONAL_PLAYER.has(matchEventDraft?.event_type || '')
                    ? t('dashboard.admin.matches.eventPlayerOptional')
                    : t('dashboard.admin.matches.eventPlayerSelect')}
                </MenuItem>
                {primaryEventPlayers.map((player) => (
                  <MenuItem key={player.guid} value={player.guid}>
                    {player.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label={t('dashboard.admin.matches.eventRelatedPlayer')}
                value={matchEventDraft?.related_player_guid || ''}
                onChange={onMatchEventDraftField('related_player_guid')}
              >
                <MenuItem value="">
                  {t('dashboard.admin.matches.eventRelatedPlayerOptional')}
                </MenuItem>
                {relatedEventPlayers.map((player) => (
                  <MenuItem key={player.guid} value={player.guid}>
                    {player.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                type="number"
                fullWidth
                label={t('dashboard.admin.matches.eventMinute')}
                value={matchEventDraft?.minute ?? ''}
                onChange={onMatchEventDraftField('minute')}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                type="number"
                fullWidth
                label={t('dashboard.admin.matches.eventSecond')}
                value={matchEventDraft?.second ?? ''}
                onChange={onMatchEventDraftField('second')}
                inputProps={{ min: 0, max: 59 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('dashboard.admin.matches.eventNote')}
                value={matchEventDraft?.note || ''}
                onChange={onMatchEventDraftField('note')}
                placeholder={t('dashboard.admin.matches.eventNotePlaceholder')}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              onClick={handleCreateMatchEvent}
              disabled={loading || matchStatsLoading}
            >
              {t('dashboard.admin.matches.createEvent')}
            </Button>
          </Stack>
        </Stack>
      </Collapse>
    </>
  )
}
