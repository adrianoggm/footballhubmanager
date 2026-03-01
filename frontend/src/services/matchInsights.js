const safeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

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

const pairKey = (leftGuid, rightGuid) =>
  leftGuid < rightGuid ? `${leftGuid}__${rightGuid}` : `${rightGuid}__${leftGuid}`

const rate = (value, total) => (total > 0 ? value / total : 0)

const withOutcome = (bucket, outcome) => {
  if (outcome === 'win') {
    bucket.wins += 1
    return
  }
  if (outcome === 'loss') {
    bucket.losses += 1
    return
  }
  bucket.draws += 1
}

const normalizePlayers = (players) => {
  const seen = new Set()
  const normalized = []
  ;(players || []).forEach((player) => {
    const guid = String(player?.player_guid || '').trim()
    if (!guid || seen.has(guid)) {
      return
    }
    seen.add(guid)
    normalized.push(player)
  })
  return normalized
}

const topByMetric = (items, metric, size) =>
  [...items]
    .sort((left, right) => {
      if (right[metric] === left[metric]) {
        return right.appearances - left.appearances
      }
      return right[metric] - left[metric]
    })
    .slice(0, size)

export function buildMatchInsightsReport(
  matchDetails,
  { matrixSize = 8, topPairsSize = 10, leadersSize = 5 } = {}
) {
  const playerStats = new Map()
  const pairStats = new Map()
  const teammateGraph = new Map()
  const seasonsInReport = new Set()
  const seasonAggregateByGuid = new Map()
  const matchTimelineRaw = []

  let matchesAnalyzed = 0
  let totalGoals = 0
  let totalAssists = 0
  let totalSaves = 0
  let totalLineupEntries = 0

  const ensureSeasonAggregate = (seasonGuid) => {
    const key = String(seasonGuid || 'unknown')
    if (!seasonAggregateByGuid.has(key)) {
      seasonAggregateByGuid.set(key, {
        season_guid: key,
        matches: 0,
        goals: 0,
        assists: 0,
        saves: 0,
        lineup_entries: 0,
        first_match_date: null,
        last_match_date: null
      })
    }
    return seasonAggregateByGuid.get(key)
  }

  const ensurePlayer = (player) => {
    const guid = String(player?.player_guid || '').trim()
    if (!guid) {
      return null
    }
    if (!playerStats.has(guid)) {
      playerStats.set(guid, {
        guid,
        label: formatPlayerName(player),
        appearances: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals: 0,
        assists: 0,
        saves: 0
      })
    }
    return playerStats.get(guid)
  }

  const ensurePair = (leftGuid, rightGuid) => {
    const key = pairKey(leftGuid, rightGuid)
    if (!pairStats.has(key)) {
      const [a, b] = leftGuid < rightGuid ? [leftGuid, rightGuid] : [rightGuid, leftGuid]
      pairStats.set(key, {
        leftGuid: a,
        rightGuid: b,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0
      })
    }
    return pairStats.get(key)
  }

  const ensureEdge = (fromGuid, toGuid) => {
    if (!teammateGraph.has(fromGuid)) {
      teammateGraph.set(fromGuid, new Map())
    }
    const edges = teammateGraph.get(fromGuid)
    if (!edges.has(toGuid)) {
      edges.set(toGuid, {
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0
      })
    }
    return edges.get(toGuid)
  }

  ;(matchDetails || []).forEach((detail) => {
    if (!detail || String(detail.status || '').toLowerCase() !== 'closed') {
      return
    }
    matchesAnalyzed += 1
    if (detail.season_guid) {
      seasonsInReport.add(detail.season_guid)
    }

    const homeScore = safeNumber(detail?.home_team?.score)
    const awayScore = safeNumber(detail?.away_team?.score)
    const matchGoals = homeScore + awayScore
    totalGoals += matchGoals
    let matchAssists = 0
    let matchSaves = 0
    let matchLineupEntries = 0

    const outcomeHome =
      homeScore > awayScore ? 'win' : homeScore < awayScore ? 'loss' : 'draw'
    const outcomeAway =
      awayScore > homeScore ? 'win' : awayScore < homeScore ? 'loss' : 'draw'

    const teamEntries = [
      { team: detail.home_team, outcome: outcomeHome },
      { team: detail.away_team, outcome: outcomeAway }
    ]

    teamEntries.forEach(({ team, outcome }) => {
      const players = normalizePlayers(team?.players)
      totalLineupEntries += players.length
      matchLineupEntries += players.length

      players.forEach((player) => {
        const summary = ensurePlayer(player)
        if (!summary) {
          return
        }
        summary.appearances += 1
        summary.goals += safeNumber(player.goals)
        summary.assists += safeNumber(player.assists)
        summary.saves += safeNumber(player.saves)
        const assists = safeNumber(player.assists)
        const saves = safeNumber(player.saves)
        totalAssists += assists
        totalSaves += saves
        matchAssists += assists
        matchSaves += saves
        withOutcome(summary, outcome)
      })

      for (let index = 0; index < players.length; index += 1) {
        const leftGuid = String(players[index]?.player_guid || '').trim()
        if (!leftGuid) {
          continue
        }
        for (let inner = index + 1; inner < players.length; inner += 1) {
          const rightGuid = String(players[inner]?.player_guid || '').trim()
          if (!rightGuid) {
            continue
          }
          const pair = ensurePair(leftGuid, rightGuid)
          pair.matches += 1
          withOutcome(pair, outcome)

          const edgeForward = ensureEdge(leftGuid, rightGuid)
          edgeForward.matches += 1
          withOutcome(edgeForward, outcome)

          const edgeBackward = ensureEdge(rightGuid, leftGuid)
          edgeBackward.matches += 1
          withOutcome(edgeBackward, outcome)
        }
      }
    })

    const seasonAggregate = ensureSeasonAggregate(detail.season_guid)
    seasonAggregate.matches += 1
    seasonAggregate.goals += matchGoals
    seasonAggregate.assists += matchAssists
    seasonAggregate.saves += matchSaves
    seasonAggregate.lineup_entries += matchLineupEntries
    if (!seasonAggregate.first_match_date || String(detail.match_date || '') < seasonAggregate.first_match_date) {
      seasonAggregate.first_match_date = String(detail.match_date || '')
    }
    if (!seasonAggregate.last_match_date || String(detail.match_date || '') > seasonAggregate.last_match_date) {
      seasonAggregate.last_match_date = String(detail.match_date || '')
    }

    matchTimelineRaw.push({
      season_guid: String(detail.season_guid || 'unknown'),
      match_guid: String(detail.guid || ''),
      match_date: String(detail.match_date || ''),
      goals: matchGoals,
      assists: matchAssists,
      saves: matchSaves,
      average_players_per_team: rate(matchLineupEntries, 2),
      home_score: homeScore,
      away_score: awayScore
    })
  })

  const players = Array.from(playerStats.values()).map((player) => ({
    ...player,
    win_rate: rate(player.wins, player.appearances)
  }))

  players.sort((left, right) => {
    if (right.appearances === left.appearances) {
      return right.wins - left.wins
    }
    return right.appearances - left.appearances
  })

  const pairRows = Array.from(pairStats.values())
    .map((pair) => {
      const leftPlayer = playerStats.get(pair.leftGuid)
      const rightPlayer = playerStats.get(pair.rightGuid)
      return {
        ...pair,
        label: `${leftPlayer?.label || pair.leftGuid} + ${rightPlayer?.label || pair.rightGuid}`,
        win_rate: rate(pair.wins, pair.matches)
      }
    })
    .sort((left, right) => {
      if (right.matches === left.matches) {
        return right.wins - left.wins
      }
      return right.matches - left.matches
    })

  const topPairs = pairRows.slice(0, topPairsSize)

  const topTeammatesByPlayer = players
    .map((player) => {
      const edges = teammateGraph.get(player.guid)
      if (!edges || !edges.size) {
        return null
      }
      const bestPartner = Array.from(edges.entries()).reduce((best, [partnerGuid, stats]) => {
        if (!best) {
          return { partnerGuid, ...stats }
        }
        if (stats.matches > best.matches) {
          return { partnerGuid, ...stats }
        }
        if (stats.matches === best.matches && stats.wins > best.wins) {
          return { partnerGuid, ...stats }
        }
        return best
      }, null)
      if (!bestPartner) {
        return null
      }
      return {
        player_guid: player.guid,
        player_label: player.label,
        partner_guid: bestPartner.partnerGuid,
        partner_label: playerStats.get(bestPartner.partnerGuid)?.label || bestPartner.partnerGuid,
        matches: bestPartner.matches,
        wins: bestPartner.wins,
        draws: bestPartner.draws,
        losses: bestPartner.losses,
        win_rate: rate(bestPartner.wins, bestPartner.matches)
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.matches === left.matches) {
        return right.wins - left.wins
      }
      return right.matches - left.matches
    })

  const matrixPlayers = players.slice(0, matrixSize).map((player) => ({
    guid: player.guid,
    label: player.label,
    appearances: player.appearances
  }))

  const matrixRows = matrixPlayers.map((rowPlayer) => ({
    player: rowPlayer,
    cells: matrixPlayers.map((columnPlayer) => {
      if (rowPlayer.guid === columnPlayer.guid) {
        return {
          player_guid: rowPlayer.guid,
          teammate_guid: columnPlayer.guid,
          same_player: true,
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          win_rate: 0
        }
      }
      const pair = pairStats.get(pairKey(rowPlayer.guid, columnPlayer.guid))
      if (!pair) {
        return {
          player_guid: rowPlayer.guid,
          teammate_guid: columnPlayer.guid,
          same_player: false,
          matches: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          win_rate: 0
        }
      }
      return {
        player_guid: rowPlayer.guid,
        teammate_guid: columnPlayer.guid,
        same_player: false,
        matches: pair.matches,
        wins: pair.wins,
        draws: pair.draws,
        losses: pair.losses,
        win_rate: rate(pair.wins, pair.matches)
      }
    })
  }))

  const timelineByMatch = [...matchTimelineRaw]
    .sort((left, right) => {
      if (left.match_date === right.match_date) {
        return right.match_guid.localeCompare(left.match_guid)
      }
      return left.match_date.localeCompare(right.match_date)
    })
    .map((item, index, source) => {
      const accum = source.slice(0, index + 1).reduce(
        (current, point) => ({
          goals: current.goals + point.goals,
          assists: current.assists + point.assists,
          saves: current.saves + point.saves
        }),
        { goals: 0, assists: 0, saves: 0 }
      )
      const matches = index + 1
      return {
        ...item,
        match_index: matches,
        label: `M${matches}`,
        running_goals_per_match: rate(accum.goals, matches),
        running_assists_per_match: rate(accum.assists, matches),
        running_saves_per_match: rate(accum.saves, matches)
      }
    })

  const timelineBySeason = Array.from(seasonAggregateByGuid.values())
    .sort((left, right) => {
      if (left.first_match_date === right.first_match_date) {
        return left.season_guid.localeCompare(right.season_guid)
      }
      return String(left.first_match_date || '').localeCompare(String(right.first_match_date || ''))
    })
    .map((season) => ({
      season_guid: season.season_guid,
      matches: season.matches,
      goals_per_match: rate(season.goals, season.matches),
      assists_per_match: rate(season.assists, season.matches),
      saves_per_match: rate(season.saves, season.matches),
      average_players_per_team: rate(season.lineup_entries, season.matches * 2)
    }))

  return {
    matches_analyzed: matchesAnalyzed,
    seasons_analyzed: seasonsInReport.size,
    total_goals: totalGoals,
    total_assists: totalAssists,
    total_saves: totalSaves,
    goals_per_match: rate(totalGoals, matchesAnalyzed),
    assists_per_match: rate(totalAssists, matchesAnalyzed),
    saves_per_match: rate(totalSaves, matchesAnalyzed),
    average_players_per_team: rate(totalLineupEntries, matchesAnalyzed * 2),
    top_pairs: topPairs,
    top_teammates_by_player: topTeammatesByPlayer,
    matrix_players: matrixPlayers,
    matrix_rows: matrixRows,
    timeline_by_match: timelineByMatch,
    timeline_by_season: timelineBySeason,
    leaders: {
      scorers: topByMetric(players, 'goals', leadersSize),
      assisters: topByMetric(players, 'assists', leadersSize),
      savers: topByMetric(players, 'saves', leadersSize)
    }
  }
}

export function compareMatchInsightSummaries(leftReport, rightReport) {
  if (!leftReport || !rightReport) {
    return null
  }
  return {
    goals_per_match_delta: safeNumber(leftReport.goals_per_match) - safeNumber(rightReport.goals_per_match),
    assists_per_match_delta:
      safeNumber(leftReport.assists_per_match) - safeNumber(rightReport.assists_per_match),
    saves_per_match_delta: safeNumber(leftReport.saves_per_match) - safeNumber(rightReport.saves_per_match),
    average_players_per_team_delta:
      safeNumber(leftReport.average_players_per_team) - safeNumber(rightReport.average_players_per_team)
  }
}
