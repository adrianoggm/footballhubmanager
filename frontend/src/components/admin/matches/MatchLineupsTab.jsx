import { Alert, Button, Stack } from '@mui/material'

import LineupDragBuilder from '../../LineupDragBuilder.jsx'

export default function MatchLineupsTab({
  selectedMatchDetail,
  hasLineupAudit,
  matchEditorLineupPlayers,
  matchDraftHomeGuids,
  matchDraftAwayGuids,
  onMatchLineupsDraftChange,
  handleSaveMatchLineups,
  loading,
  matchStatsLoading,
  t,
}) {
  return (
    <Stack spacing={2}>
      {hasLineupAudit && (
        <Alert severity="warning">
          {t('dashboard.admin.matches.lineupAuditHint', {
            count: selectedMatchDetail.lineup_change_count,
          })}
        </Alert>
      )}

      <LineupDragBuilder
        players={matchEditorLineupPlayers}
        homeGuids={matchDraftHomeGuids}
        awayGuids={matchDraftAwayGuids}
        onChange={onMatchLineupsDraftChange}
        availableTitle={t('dashboard.admin.matches.availablePlayers')}
        homeTitle={
          selectedMatchDetail.home_team.team_name || t('dashboard.admin.matches.homeLineup')
        }
        awayTitle={
          selectedMatchDetail.away_team.team_name || t('dashboard.admin.matches.awayLineup')
        }
        helperText={t('dashboard.admin.matches.lineupBoardHint')}
        emptyText={t('dashboard.admin.matches.lineupEmpty')}
        addHomeText={t('dashboard.admin.matches.addToHome')}
        addAwayText={t('dashboard.admin.matches.addToAway')}
        moveHomeText={t('dashboard.admin.matches.moveToHome')}
        moveAwayText={t('dashboard.admin.matches.moveToAway')}
        removeText={t('dashboard.admin.matches.removeFromLineup')}
        disabled={loading || matchStatsLoading}
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button
          variant="contained"
          onClick={handleSaveMatchLineups}
          disabled={loading || matchStatsLoading}
        >
          {t('dashboard.admin.matches.saveLineups')}
        </Button>
      </Stack>
    </Stack>
  )
}
