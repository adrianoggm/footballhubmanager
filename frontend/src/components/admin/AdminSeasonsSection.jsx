import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'

export default function AdminSeasonsSection({ state, actions, helpers }) {
  const { t, formatDate } = helpers
  const {
    activeSeason,
    selectedSeason,
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
    selectedSeasonDateErrors
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
    handleSelectSeasonFromHistory
  } = actions

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1.25}>
                <Typography variant="h6">{t('dashboard.admin.seasons.configTitle')}</Typography>
                {activeSeason && <Chip size="small" color="secondary" label={activeSeasonLabel} />}
                {selectedSeason && <Chip size="small" color="primary" label={selectedSeasonLabel} />}
              </Stack>

              {!activeSeason && (
                <Alert severity="warning">
                  {t('dashboard.admin.seasons.noActiveWarning')}
                </Alert>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="date"
                  label={t('dashboard.admin.seasons.startDate')}
                  InputLabelProps={{ shrink: true }}
                  value={seasonForm.start_date}
                  onChange={onSeasonField('start_date')}
                  fullWidth
                />
                <TextField
                  type="date"
                  label={t('dashboard.admin.seasons.endDate')}
                  InputLabelProps={{ shrink: true }}
                  value={seasonForm.end_date}
                  onChange={onSeasonField('end_date')}
                  fullWidth
                />
              </Stack>

              {latestSeasonEndDate && (
                <Button variant="text" onClick={handlePrefillNextSeason} disabled={loading}>
                  {t('dashboard.admin.seasons.useAfterLatest')}
                </Button>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  type="number"
                  label={t('dashboard.admin.seasons.winPoints')}
                  value={seasonForm.points_win}
                  onChange={onSeasonField('points_win')}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t('dashboard.admin.seasons.drawPoints')}
                  value={seasonForm.points_draw}
                  onChange={onSeasonField('points_draw')}
                  fullWidth
                />
                <TextField
                  type="number"
                  label={t('dashboard.admin.seasons.lossPoints')}
                  value={seasonForm.points_loss}
                  onChange={onSeasonField('points_loss')}
                  fullWidth
                />
              </Stack>

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

              <Button variant="contained" onClick={handleCreateSeason} disabled={loading}>
                {t('dashboard.admin.seasons.createSeason')}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.admin.seasons.overlapHint')}
              </Typography>

              <Divider />

              <Typography variant="subtitle1">{t('dashboard.admin.seasons.selectedSeasonConfigTitle')}</Typography>
              {!selectedSeasonGuid && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.seasons.selectSeasonHint')}
                </Typography>
              )}
              {selectedSeasonGuid && (
                <>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="date"
                      label={t('dashboard.admin.seasons.startDate')}
                      InputLabelProps={{ shrink: true }}
                      value={selectedSeasonForm.start_date}
                      onChange={onSelectedSeasonField('start_date')}
                      error={Boolean(selectedSeasonDateErrors.start_date)}
                      helperText={selectedSeasonDateErrors.start_date || undefined}
                      fullWidth
                    />
                    <TextField
                      type="date"
                      label={t('dashboard.admin.seasons.endDate')}
                      InputLabelProps={{ shrink: true }}
                      value={selectedSeasonForm.end_date}
                      onChange={onSelectedSeasonField('end_date')}
                      error={Boolean(selectedSeasonDateErrors.end_date)}
                      helperText={selectedSeasonDateErrors.end_date || undefined}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.winPoints')}
                      value={selectedSeasonForm.points_win}
                      onChange={onSelectedSeasonField('points_win')}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.drawPoints')}
                      value={selectedSeasonForm.points_draw}
                      onChange={onSelectedSeasonField('points_draw')}
                      fullWidth
                    />
                    <TextField
                      type="number"
                      label={t('dashboard.admin.seasons.lossPoints')}
                      value={selectedSeasonForm.points_loss}
                      onChange={onSelectedSeasonField('points_loss')}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      variant="outlined"
                      onClick={handleUpdateSelectedSeason}
                      disabled={loading || !selectedSeasonGuid}
                    >
                      {t('dashboard.admin.seasons.saveSelectedSeason')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleRequestDeleteSelectedSeason}
                      disabled={loading || !selectedSeasonGuid}
                    >
                      {t('dashboard.admin.seasons.deleteSelectedSeason')}
                    </Button>
                  </Stack>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6">{t('dashboard.admin.seasons.historyTitle')}</Typography>
              {!historySeasons.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.seasons.noHistory')}
                </Typography>
              )}
              {historySeasons.map((season) => (
                <Box
                  key={season.guid}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border:
                      selectedSeasonGuid === season.guid
                        ? '1px solid rgba(25,118,210,0.35)'
                        : '1px solid rgba(15,23,42,0.08)',
                    backgroundColor: 'rgba(255,255,255,0.6)'
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
                          loss: season.points_loss
                        })}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      variant={selectedSeasonGuid === season.guid ? 'contained' : 'text'}
                      onClick={() => handleSelectSeasonFromHistory(season.guid)}
                      disabled={selectedSeasonGuid === season.guid}
                    >
                      {selectedSeasonGuid === season.guid
                        ? t('dashboard.admin.seasons.selectedSeasonAction')
                        : t('dashboard.admin.seasons.selectSeasonAction')}
                    </Button>
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
