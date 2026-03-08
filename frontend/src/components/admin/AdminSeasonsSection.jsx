import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

export default function AdminSeasonsSection({ state, actions, helpers }) {
  const { t, formatDate } = helpers
  const {
    activeSeason,
    activeSeasonLabel,
    selectedSeasonLabel,
    latestSeasonEndDate,
    seasonForm,
    importPreviousSeasonRoster,
    importSourceSeasonGuid,
    seasonImportCandidates,
    loading,
    historySeasons,
    selectedSeasonGuid,
    selectedSeasonForm,
    selectedSeasonDateErrors,
  } = state
  const {
    onSeasonField,
    handlePrefillNextSeason,
    onImportPreviousSeasonRosterChange,
    onImportSourceSeasonGuidChange,
    handleCreateSeason,
    onSelectedSeasonField,
    handleUpdateSelectedSeason,
    handleRequestDeleteSelectedSeason,
    handleSelectSeasonFromHistory,
  } = actions

  const isEditingSelectedSeason = Boolean(selectedSeasonGuid)
  const seasonFields = isEditingSelectedSeason ? selectedSeasonForm : seasonForm
  const onSeasonFieldsChange = isEditingSelectedSeason ? onSelectedSeasonField : onSeasonField
  const startDateError = isEditingSelectedSeason ? selectedSeasonDateErrors.start_date : ''
  const endDateError = isEditingSelectedSeason ? selectedSeasonDateErrors.end_date : ''
  const handleResetToCreate = () => {
    if (!selectedSeasonGuid) {
      return
    }
    handleSelectSeasonFromHistory(selectedSeasonGuid)
  }

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }}
                spacing={1.25}
              >
                <Typography variant="h6">{t('dashboard.admin.seasons.configTitle')}</Typography>
                <Chip
                  size="small"
                  color={isEditingSelectedSeason ? 'primary' : 'default'}
                  label={
                    isEditingSelectedSeason
                      ? t('dashboard.admin.seasons.formEditTitle')
                      : t('dashboard.admin.seasons.formCreateTitle')
                  }
                />
                {activeSeason && <Chip size="small" color="secondary" label={activeSeasonLabel} />}
              </Stack>

              <Alert severity={isEditingSelectedSeason ? 'info' : 'success'}>
                {isEditingSelectedSeason
                  ? t('dashboard.admin.seasons.formEditActive', { season: selectedSeasonLabel })
                  : t('dashboard.admin.seasons.formCreateHint')}
              </Alert>

              {!activeSeason && (
                <Alert severity="warning">{t('dashboard.admin.seasons.noActiveWarning')}</Alert>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label={t('dashboard.admin.seasons.startDate')}
                  InputLabelProps={{ shrink: true }}
                  value={seasonFields.start_date}
                  onChange={onSeasonFieldsChange('start_date')}
                  error={Boolean(startDateError)}
                  helperText={startDateError || undefined}
                  fullWidth
                />
                <TextField
                  type="date"
                  label={t('dashboard.admin.seasons.endDate')}
                  InputLabelProps={{ shrink: true }}
                  value={seasonFields.end_date}
                  onChange={onSeasonFieldsChange('end_date')}
                  error={Boolean(endDateError)}
                  helperText={endDateError || undefined}
                  fullWidth
                />
              </Stack>

              {!isEditingSelectedSeason && latestSeasonEndDate && (
                <Button variant="text" onClick={handlePrefillNextSeason} disabled={loading}>
                  {t('dashboard.admin.seasons.useAfterLatest')}
                </Button>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="number"
                  label={t('dashboard.admin.seasons.winPoints')}
                  value={seasonFields.points_win}
                  onChange={onSeasonFieldsChange('points_win')}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t('dashboard.admin.seasons.drawPoints')}
                  value={seasonFields.points_draw}
                  onChange={onSeasonFieldsChange('points_draw')}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t('dashboard.admin.seasons.lossPoints')}
                  value={seasonFields.points_loss}
                  onChange={onSeasonFieldsChange('points_loss')}
                  fullWidth
                />
              </Stack>

              {!isEditingSelectedSeason && (
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px dashed rgba(15,23,42,0.2)',
                    backgroundColor: 'rgba(148,163,184,0.06)',
                  }}
                >
                  <Stack spacing={1.25}>
                    <Typography variant="subtitle2">
                      {t('dashboard.admin.seasons.importSectionTitle')}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={importPreviousSeasonRoster}
                          onChange={onImportPreviousSeasonRosterChange}
                          disabled={loading || !seasonImportCandidates.length}
                        />
                      }
                      label={t('dashboard.admin.seasons.importPreviousToggle')}
                    />
                    {importPreviousSeasonRoster && seasonImportCandidates.length > 0 && (
                      <TextField
                        select
                        label={t('dashboard.admin.seasons.importSourceLabel')}
                        value={importSourceSeasonGuid}
                        onChange={onImportSourceSeasonGuidChange}
                        helperText={t('dashboard.admin.seasons.importSourceHelper')}
                        fullWidth
                      >
                        {seasonImportCandidates.map((season) => (
                          <MenuItem key={season.guid} value={season.guid}>
                            {formatDate(season.start_date)} - {formatDate(season.end_date)}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                    {importPreviousSeasonRoster && !seasonImportCandidates.length && (
                      <Typography variant="body2" color="text.secondary">
                        {t('dashboard.admin.seasons.importSourceEmpty')}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={
                    isEditingSelectedSeason ? handleUpdateSelectedSeason : handleCreateSeason
                  }
                  disabled={loading}
                >
                  {isEditingSelectedSeason
                    ? t('dashboard.admin.seasons.saveSelectedSeason')
                    : t('dashboard.admin.seasons.createSeason')}
                </Button>
                {isEditingSelectedSeason && (
                  <>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleRequestDeleteSelectedSeason}
                      disabled={loading || !selectedSeasonGuid}
                    >
                      {t('dashboard.admin.seasons.deleteSelectedSeason')}
                    </Button>
                    <Button variant="text" onClick={handleResetToCreate} disabled={loading}>
                      {t('dashboard.admin.seasons.startNewSeasonAction')}
                    </Button>
                  </>
                )}
              </Stack>

              <Typography variant="caption" color="text.secondary">
                {isEditingSelectedSeason
                  ? t('dashboard.admin.seasons.formEditHint')
                  : t('dashboard.admin.seasons.overlapHint')}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6">{t('dashboard.admin.seasons.historyTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.seasons.historyHint')}
              </Typography>
              <Button
                variant="outlined"
                onClick={handleResetToCreate}
                disabled={loading || !selectedSeasonGuid}
              >
                {t('dashboard.admin.seasons.startNewSeasonAction')}
              </Button>
              {!historySeasons.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.seasons.noHistory')}
                </Typography>
              )}
              {historySeasons.map((season) => (
                // Entire season card is clickable to keep the interaction model simple.
                <Box
                  key={season.guid}
                  role="button"
                  tabIndex={loading ? -1 : 0}
                  onClick={() => {
                    if (!loading) {
                      handleSelectSeasonFromHistory(season.guid)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (loading) {
                      return
                    }
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleSelectSeasonFromHistory(season.guid)
                    }
                  }}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border:
                      selectedSeasonGuid === season.guid
                        ? '1px solid rgba(25,118,210,0.35)'
                        : '1px solid rgba(15,23,42,0.08)',
                    backgroundColor:
                      selectedSeasonGuid === season.guid
                        ? 'rgba(25,118,210,0.06)'
                        : 'rgba(255,255,255,0.6)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    transition: 'border-color 120ms ease, background-color 120ms ease',
                    '&:hover': loading
                      ? undefined
                      : {
                          borderColor: 'rgba(25,118,210,0.35)',
                          backgroundColor: 'rgba(25,118,210,0.03)',
                        },
                    '&:focus-visible': {
                      outline: '2px solid rgba(25,118,210,0.6)',
                      outlineOffset: 2,
                    },
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
                    <Chip
                      size="small"
                      color={selectedSeasonGuid === season.guid ? 'primary' : 'default'}
                      label={
                        selectedSeasonGuid === season.guid
                          ? t('dashboard.admin.seasons.historyEditingBadge')
                          : t('dashboard.admin.seasons.historyEditBadge')
                      }
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
