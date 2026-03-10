const safeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function compareMatchInsightSummaries(leftReport, rightReport) {
  if (!leftReport || !rightReport) {
    return null
  }
  return {
    goals_per_match_delta:
      safeNumber(leftReport.goals_per_match) - safeNumber(rightReport.goals_per_match),
    assists_per_match_delta:
      safeNumber(leftReport.assists_per_match) - safeNumber(rightReport.assists_per_match),
    saves_per_match_delta:
      safeNumber(leftReport.saves_per_match) - safeNumber(rightReport.saves_per_match),
    average_players_per_team_delta:
      safeNumber(leftReport.average_players_per_team) -
      safeNumber(rightReport.average_players_per_team),
  }
}
