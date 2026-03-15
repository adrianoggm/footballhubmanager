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
  Step,
  StepLabel,
  Stepper,
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
  const pointsValues = [seasonFields.points_win, seasonFields.points_draw, seasonFields.points_loss]
  const pointsValid = pointsValues.every((value) => Number.isInteger(value) && value >= 0)
  const dateRangeValid =
    Boolean(seasonFields.start_date) &&
    Boolean(seasonFields.end_date) &&
    seasonFields.start_date <= seasonFields.end_date
  const stepTwoComplete = dateRangeValid && pointsValid
  const flowSteps = [
    t('dashboard.admin.seasons.stepSelectCreate'),
    t('dashboard.admin.seasons.stepConfigure'),
    t('dashboard.admin.seasons.stepSave'),
  ]
  const activeStep = loading ? 2 : stepTwoComplete ? 2 : 1
  const handleResetToCreate = () => {
    if (!selectedSeasonGuid) {
      return
    }
    handleSelectSeasonFromHistory(selectedSeasonGuid)
  }

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} xl={8} sx={{ minWidth: 0 }}>
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

              <Stepper activeStep={activeStep}>
                {flowSteps.map((label, index) => (
                  <Step
                    key={label}
                    completed={index === 0 ? true : index === 1 ? stepTwoComplete : false}
                  >
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

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

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
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

      <Grid item xs={12} xl={4} sx={{ minWidth: 0 }}>
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
              {historySeasons.map((season) => {
                const isSelected = selectedSeasonGuid === season.guid
                const isActive = activeSeason?.guid === season.guid
                const canSelect = !loading && !isSelected
                return (
                  // Entire season card is clickable to keep the interaction model simple.
                  <Box
                    key={season.guid}
                    role="button"
                    aria-pressed={isSelected}
                    tabIndex={canSelect ? 0 : -1}
                    onClick={() => {
                      if (canSelect) {
                        handleSelectSeasonFromHistory(season.guid)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!canSelect) {
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
                      border: isSelected
                        ? '1px solid rgba(25,118,210,0.35)'
                        : '1px solid rgba(15,23,42,0.08)',
                      backgroundColor: isSelected
                        ? 'rgba(25,118,210,0.06)'
                        : 'rgba(255,255,255,0.6)',
                      cursor: canSelect ? 'pointer' : 'default',
                      opacity: loading ? 0.7 : 1,
                      transition: 'border-color 120ms ease, background-color 120ms ease',
                      '&:hover': canSelect
                        ? {
                            borderColor: 'rgba(25,118,210,0.35)',
                            backgroundColor: 'rgba(25,118,210,0.03)',
                          }
                        : undefined,
                      '&:focus-visible': canSelect
                        ? {
                            outline: '2px solid rgba(25,118,210,0.6)',
                            outlineOffset: 2,
                          }
                        : undefined,
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
                      <Stack direction="row" spacing={0.75}>
                        {isActive && (
                          <Chip
                            size="small"
                            color="secondary"
                            label={t('dashboard.admin.seasons.historyActiveBadge')}
                          />
                        )}
                        <Chip
                          size="small"
                          color={isSelected ? 'primary' : 'default'}
                          label={
                            isSelected
                              ? t('dashboard.admin.seasons.historyEditingBadge')
                              : t('dashboard.admin.seasons.historyEditBadge')
                          }
                        />
                      </Stack>
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
