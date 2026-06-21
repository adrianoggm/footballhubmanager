import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { memo } from 'react'

import { trackingChipColor, trackingLabel } from './trackingHelpers.js'

const TeamStatsTable = memo(function TeamStatsTable({
  teamKey,
  team,
  draftPlayers,
  onMatchStatsDraftField,
  formatPlayerDisplayName,
  t,
}) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {t('dashboard.admin.matches.teamStats', { team: team.team_name })}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('dashboard.admin.table.player')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.goals')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.assists')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.saves')}</TableCell>
            <TableCell>{t('dashboard.admin.matches.rating')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {team.players.map((player) => {
            const draft = (draftPlayers || []).find(
              (item) => item.player_guid === player.player_guid
            )
            return (
              <TableRow key={player.player_guid}>
                <TableCell>{formatPlayerDisplayName(player)}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.goals ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'goals')}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.assists ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'assists')}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.saves ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'saves')}
                    inputProps={{ min: 0 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    size="small"
                    value={draft?.rating ?? '0'}
                    onChange={onMatchStatsDraftField(teamKey, player.player_guid, 'rating')}
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ maxWidth: 90 }}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
})

export default function MatchStatsTab({
  selectedMatchDetail,
  officiallyClosed,
  trackingFinished,
  officialScoreLabel,
  matchStatsDraft,
  onMatchStatsDraftField,
  formatPlayerDisplayName,
  handleSaveMatchStats,
  loading,
  matchStatsLoading,
  t,
}) {
  return (
    <Stack spacing={2}>
      <Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {t('dashboard.admin.matches.reportSectionTitle')}
          </Typography>
          {officiallyClosed || trackingFinished ? (
            <Chip
              size="small"
              color="primary"
              label={t('dashboard.admin.matches.workflowRecommended')}
            />
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.admin.matches.manualResultTitle', {
            home: selectedMatchDetail.home_team.team_name,
            away: selectedMatchDetail.away_team.team_name,
          })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.admin.matches.manualResultDescription')}
        </Typography>
      </Box>

      <Alert severity="info">{t('dashboard.admin.matches.manualResultHint')}</Alert>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.admin.matches.status')}:
        </Typography>
        <Chip
          size="small"
          color={selectedMatchDetail.status === 'closed' ? 'success' : 'warning'}
          label={
            selectedMatchDetail.status === 'closed'
              ? t('dashboard.admin.matches.statusClosed')
              : t('dashboard.admin.matches.statusOpen')
          }
        />
        <Chip
          size="small"
          color={trackingChipColor(selectedMatchDetail.tracking_status)}
          label={trackingLabel(selectedMatchDetail.tracking_status, t)}
        />
        <Chip size="small" variant="outlined" label={officialScoreLabel} />
      </Stack>

      {selectedMatchDetail.status === 'closed' && (
        <Alert severity="warning">{t('dashboard.admin.matches.closedMatchEditableHint')}</Alert>
      )}

      <Grid container spacing={2}>
        {[
          { key: 'home_team', team: selectedMatchDetail.home_team },
          { key: 'away_team', team: selectedMatchDetail.away_team },
        ].map(({ key, team }) => (
          <Grid key={key} item xs={12} lg={6} sx={{ minWidth: 0 }}>
            <TeamStatsTable
              teamKey={key}
              team={team}
              draftPlayers={matchStatsDraft[key]?.players}
              onMatchStatsDraftField={onMatchStatsDraftField}
              formatPlayerDisplayName={formatPlayerDisplayName}
              t={t}
            />
          </Grid>
        ))}
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          onClick={handleSaveMatchStats}
          disabled={loading || matchStatsLoading}
        >
          {t('dashboard.admin.matches.saveStats')}
        </Button>
      </Stack>
    </Stack>
  )
}
