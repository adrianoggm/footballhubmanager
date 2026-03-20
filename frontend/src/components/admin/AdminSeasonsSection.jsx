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
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import { SeasonFormFields } from './SeasonFormFields'
import { SeasonHistoryItem } from './SeasonHistoryItem'
import { ImportRosterSelector } from './ImportRosterSelector'

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

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                <Typography variant="h6">{t('dashboard.admin.seasons.configTitle')}</Typography>
                {activeSeason && <Chip size="small" color="secondary" label={activeSeasonLabel} />}
                {selectedSeason && (
                  <Chip size="small" color="primary" label={selectedSeasonLabel} />
                )}
              </Stack>

              {!activeSeason && (
                <Alert severity="warning">{t('dashboard.admin.seasons.noActiveWarning')}</Alert>
              )}

              <SeasonFormFields
                t={t}
                form={seasonForm}
                onChange={onSeasonField}
                disabled={loading}
              />

              {latestSeasonEndDate && (
                <Button variant="text" onClick={handlePrefillNextSeason} disabled={loading}>
                  {t('dashboard.admin.seasons.useAfterLatest')}
                </Button>
              )}

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

              <ImportRosterSelector
                t={t}
                importEnabled={importPreviousSeasonRoster}
                candidates={seasonImportCandidates}
                selectedGuid={importSourceSeasonGuid}
                onSourceChange={onImportSourceSeasonGuidChange}
                formatDate={formatDate}
              />

              <Button variant="contained" onClick={handleCreateSeason} disabled={loading}>
                {t('dashboard.admin.seasons.createSeason')}
              </Button>
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.admin.seasons.overlapHint')}
              </Typography>

              <Divider />

              <Typography variant="subtitle1">
                {t('dashboard.admin.seasons.selectedSeasonConfigTitle')}
              </Typography>
              {!selectedSeasonGuid && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.seasons.selectSeasonHint')}
                </Typography>
              )}
              {selectedSeasonGuid && (
                <>
                  <SeasonFormFields
                    t={t}
                    form={selectedSeasonForm}
                    onChange={onSelectedSeasonField}
                    dateErrors={selectedSeasonDateErrors}
                    disabled={loading}
                  />
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
                <SeasonHistoryItem
                  key={season.guid}
                  season={season}
                  formatDate={formatDate}
                  t={t}
                  isSelected={selectedSeasonGuid === season.guid}
                  onSelect={() => handleSelectSeasonFromHistory(season.guid)}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
