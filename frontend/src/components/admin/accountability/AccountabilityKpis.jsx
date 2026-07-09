import { Grid } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import DebtorsDialog from './DebtorsDialog.jsx'
import StatCard from './StatCard.jsx'
import { formatMoney, formatTrendPct } from './accountabilityHelpers.js'

const DASH = '—'

/**
 * The four headline KPI cards. `data` is the accountability payload; any KPI the
 * viewer isn't allowed to see arrives as null and renders as a dash. Clicking the
 * dues card opens the debtor breakdown (when the member list is visible).
 */
export default function AccountabilityKpis({ data, formatter, t }) {
  const theme = useTheme()
  const [debtorsOpen, setDebtorsOpen] = useState(false)

  const money = (cents) =>
    cents === null || cents === undefined ? DASH : formatMoney(formatter, cents)

  const trendPct = data?.balance_trend_pct
  const trendText = formatTrendPct(trendPct)
  const balanceSub = trendText
    ? t('dashboard.admin.accountability.kpiBalanceTrend', { pct: trendText })
    : null
  const balanceTone = trendPct > 0 ? 'positive' : trendPct < 0 ? 'negative' : 'neutral'

  const collectedPct = data?.membership_collected_pct
  const feesSub =
    collectedPct === null || collectedPct === undefined
      ? null
      : t('dashboard.admin.accountability.kpiFeesCollected', { pct: `${collectedPct}` })

  const expensesCount = data?.expenses_this_month_count
  const expensesSub =
    expensesCount === null || expensesCount === undefined
      ? null
      : t('dashboard.admin.accountability.kpiExpensesMonth', { count: `${expensesCount}` })

  const pending = data?.members_pending_count
  const duesSub =
    pending === null || pending === undefined
      ? null
      : t('dashboard.admin.accountability.kpiDuesPending', { count: `${pending}` })

  // Debtors are only listable when the member breakdown is present (admin, or a
  // user at full budget visibility). Otherwise the card stays non-interactive.
  const debtors = (data?.member_accounts || []).filter((member) => member.debt_cents > 0)

  const cards = [
    {
      key: 'balance',
      label: t('dashboard.admin.accountability.kpiBalance'),
      value: money(data?.total_balance_cents),
      sub: balanceSub,
      subTone: balanceTone,
      icon: 'account_balance',
      accent: theme.palette.secondary.main,
    },
    {
      key: 'fees',
      label: t('dashboard.admin.accountability.kpiFees'),
      value: money(data?.membership_fees_cents),
      sub: feesSub,
      subTone: 'neutral',
      icon: 'payments',
      accent: theme.palette.info.main,
    },
    {
      key: 'expenses',
      label: t('dashboard.admin.accountability.kpiExpenses'),
      value: money(data?.total_expense_cents),
      sub: expensesSub,
      subTone: 'neutral',
      icon: 'receipt_long',
      accent: '#88736A',
    },
    {
      key: 'dues',
      label: t('dashboard.admin.accountability.kpiDues'),
      value: money(data?.outstanding_dues_cents),
      sub: duesSub,
      subTone: pending ? 'negative' : 'neutral',
      icon: 'warning',
      accent: theme.palette.error.main,
      onClick: debtors.length ? () => setDebtorsOpen(true) : undefined,
    },
  ]

  return (
    <>
      <Grid container spacing={1.5}>
        {cards.map((card) => (
          <Grid key={card.key} item xs={12} sm={6} xl={3}>
            <StatCard
              label={card.label}
              value={card.value}
              sub={card.sub}
              subTone={card.subTone}
              icon={card.icon}
              accent={card.accent}
              onClick={card.onClick}
            />
          </Grid>
        ))}
      </Grid>

      <DebtorsDialog
        open={debtorsOpen}
        onClose={() => setDebtorsOpen(false)}
        t={t}
        formatter={formatter}
        debtors={debtors}
      />
    </>
  )
}
