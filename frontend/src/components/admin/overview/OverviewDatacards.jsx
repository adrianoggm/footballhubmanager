import { Grid } from '@mui/material'
import { DashboardStatCard } from '../../dashboard/DashboardShell.jsx'

/**
 * The KPI datacard row. Previously rendered by DashboardShell on every section;
 * now rendered only here so the cards live on the Overview alone (issue #144).
 * `cards` items match the DashboardStatCard `item` shape: { label, value, helper, tone }.
 */
export default function OverviewDatacards({ cards = [] }) {
  if (!cards.length) return null
  return (
    <Grid container spacing={0.9}>
      {cards.map((item) => (
        <Grid key={item.label} item xs={12} sm={6} xl={3}>
          <DashboardStatCard item={item} />
        </Grid>
      ))}
    </Grid>
  )
}
