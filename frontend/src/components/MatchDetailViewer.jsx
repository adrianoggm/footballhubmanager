import {
  Alert,
  Chip,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { formatDateEU } from '../utils/dateFormat.js'

const defaultFormatDate = formatDateEU

const formatPlayerName = (player) => {
  const fullName = [player?.name, player?.surname1, player?.surname2].filter(Boolean).join(' ')
  if (player?.nickname && fullName) {
    return `${player.nickname} (${fullName})`
  }
  if (player?.nickname) {
    return player.nickname
  }
  return fullName || player?.player_guid || '-'
}

const formatRating = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0.00'
  }
  return value.toFixed(2)
}

const toAllPlayers = (detail) => [
  ...(detail?.home_team?.players || []).map((player) => ({
    ...player,
    team: detail?.home_team?.team_name,
  })),
  ...(detail?.away_team?.players || []).map((player) => ({
    ...player,
    team: detail?.away_team?.team_name,
  })),
]

const buildHighlights = (detail, t) => {
  const players = toAllPlayers(detail)
  if (!players.length) {
    return []
  }

  const pickTop = (metricKey) =>
    players.reduce((best, current) => {
      const currentValue = Number(current?.[metricKey] ?? 0)
      if (!best || currentValue > best.value) {
        return { player: current, value: currentValue }
      }
      return best
    }, null)

  const goalsTop = pickTop('goals')
  const assistsTop = pickTop('assists')
  const savesTop = pickTop('saves')

  const highlights = []
  if (goalsTop && goalsTop.value > 0) {
    highlights.push(
      t('dashboard.common.matchDetail.highlightGoals', {
        player: formatPlayerName(goalsTop.player),
        value: goalsTop.value,
      })
    )
  }
  if (assistsTop && assistsTop.value > 0) {
    highlights.push(
      t('dashboard.common.matchDetail.highlightAssists', {
        player: formatPlayerName(assistsTop.player),
        value: assistsTop.value,
      })
    )
  }
  if (savesTop && savesTop.value > 0) {
    highlights.push(
      t('dashboard.common.matchDetail.highlightSaves', {
        player: formatPlayerName(savesTop.player),
        value: savesTop.value,
      })
    )
  }
  return highlights
}

function TeamBreakdown({ team, t }) {
  const players = team?.players || []
  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          {team?.team_name || '-'}
        </Typography>
        <Chip
          size="small"
          color="secondary"
          label={t('dashboard.common.matchDetail.teamScore', { score: team?.score ?? 0 })}
        />
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.lineupCount', { count: players.length })}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.totalAssists', {
            value: team?.total_assists ?? 0,
          })}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.totalSaves', { value: team?.total_saves ?? 0 })}
        />
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.averageRating', {
            value: formatRating(team?.average_rating),
          })}
        />
      </Stack>

      {!players.length && (
        <Typography variant="body2" color="text.secondary">
          {t('dashboard.common.matchDetail.noPlayers')}
        </Typography>
      )}

      {players.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('dashboard.common.matchDetail.player')}</TableCell>
                <TableCell>{t('dashboard.common.matchDetail.position')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.goals')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.assists')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.saves')}</TableCell>
                <TableCell align="right">{t('dashboard.common.matchDetail.rating')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.player_guid}>
                  <TableCell>{formatPlayerName(player)}</TableCell>
                  <TableCell>{player.position || '-'}</TableCell>
                  <TableCell align="right">{player.goals ?? 0}</TableCell>
                  <TableCell align="right">{player.assists ?? 0}</TableCell>
                  <TableCell align="right">{player.saves ?? 0}</TableCell>
                  <TableCell align="right">{formatRating(player.rating)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}

export default function MatchDetailViewer({
  detail,
  t,
  formatDate = defaultFormatDate,
  showSubtitle = true,
}) {
  if (!detail) {
    return null
  }

  const isClosed = String(detail.status || '').toLowerCase() === 'closed'
  const highlights = buildHighlights(detail, t)

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('dashboard.common.matchDetail.title')}
        </Typography>
        {showSubtitle && (
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.common.matchDetail.subtitle')}
          </Typography>
        )}
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Chip
          size="small"
          variant="outlined"
          label={t('dashboard.common.matchDetail.matchDate', {
            date: formatDate(detail.match_date),
          })}
        />
        <Chip
          size="small"
          color={isClosed ? 'success' : 'warning'}
          label={
            isClosed
              ? t('dashboard.admin.matches.statusClosed')
              : t('dashboard.admin.matches.statusOpen')
          }
        />
        <Chip
          size="small"
          color="primary"
          label={t('dashboard.common.matchDetail.finalScore', {
            score: `${detail.home_team?.score ?? 0} - ${detail.away_team?.score ?? 0}`,
          })}
        />
      </Stack>

      <Stack spacing={1}>
        <Typography variant="subtitle2">
          {t('dashboard.common.matchDetail.highlightsTitle')}
        </Typography>
        {highlights.length > 0 ? (
          <Stack spacing={0.75}>
            {highlights.map((highlight) => (
              <Alert key={highlight} severity="info" sx={{ py: 0 }}>
                {highlight}
              </Alert>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.common.matchDetail.noHighlights')}
          </Typography>
        )}
      </Stack>

      <Divider />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TeamBreakdown team={detail.home_team} t={t} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TeamBreakdown team={detail.away_team} t={t} />
        </Grid>
      </Grid>
    </Stack>
  )
}
