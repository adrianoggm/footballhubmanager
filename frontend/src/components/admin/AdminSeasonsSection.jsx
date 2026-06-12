import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
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

  // One form at a time: editing the selected season is the primary mode; creating
  // a new one lives in its own tab. Selecting a season (history or after create)
  // jumps to the edit tab so the form always reflects what was just picked.
  const [mode, setMode] = useState(selectedSeasonGuid ? 'edit' : 'create')
  useEffect(() => {
    setMode(selectedSeasonGuid ? 'edit' : 'create')
  }, [selectedSeasonGuid])

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.25}
                alignItems={{ sm: 'center' }}
              >
                <Typography variant="h6">{t('dashboard.admin.seasons.configTitle')}</Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {activeSeason && (
                    <Chip
                      size="small"
                      color="secondary"
                      label={t('dashboard.admin.chips.activeSeason', {
                        season: activeSeasonLabel,
                      })}
                    />
                  )}
                  {selectedSeason && (
                    <Chip
                      size="small"
                      color="primary"
                      label={t('dashboard.admin.chips.selectedSeason', {
                        season: selectedSeasonLabel,
                      })}
                    />
                  )}
                </Stack>
              </Stack>

              {!activeSeason && (
                <Alert severity="warning">{t('dashboard.admin.seasons.noActiveWarning')}</Alert>
              )}

              <Tabs
                value={mode}
                onChange={(_, next) => setMode(next)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab value="edit" label={t('dashboard.admin.seasons.tabEdit')} />
                <Tab value="create" label={t('dashboard.admin.seasons.tabCreate')} />
              </Tabs>

              {mode === 'edit' && (
                <Stack spacing={2}>
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
                          variant="contained"
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
              )}

              {mode === 'create' && (
                <Stack spacing={2}>
                  <SeasonFormFields
                    t={t}
                    form={seasonForm}
                    onChange={onSeasonField}
                    disabled={loading}
                  />

                  {latestSeasonEndDate && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handlePrefillNextSeason}
                      disabled={loading}
                      sx={{ alignSelf: 'flex-start' }}
                    >
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

                  <Stack spacing={0.5} alignItems="flex-start">
                    <Button variant="contained" onClick={handleCreateSeason} disabled={loading}>
                      {t('dashboard.admin.seasons.createSeason')}
                    </Button>
                    <Typography variant="caption" color="text.secondary">
                      {t('dashboard.admin.seasons.overlapHint')}
                    </Typography>
                  </Stack>
                </Stack>
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
