import { Grid } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import DebtorsDialog from './DebtorsDialog.jsx'
import StatCard from '../../common/StatCard.jsx'
import { countKey, formatMoney, formatPercent, formatTrendPct } from './accountabilityHelpers.js'

const DASH = '—'
const P = 'dashboard.admin.accountability'

const isMissing = (value) => value === null || value === undefined

/**
 * The headline KPI cards. `data` is the accountability payload; any KPI the viewer
 * isn't allowed to see arrives as null and its card is left out (until the data
 * has loaded, every card shows a dash). Clicking the dues card opens the debtor
 * breakdown (when the member list is visible).
 */
export default function AccountabilityKpis({ data, formatter, locale, t }) {
  const theme = useTheme()
  const [debtorsOpen, setDebtorsOpen] = useState(false)

  const money = (cents) => (isMissing(cents) ? DASH : formatMoney(formatter, cents))

  const trendPct = data?.balance_trend_pct
  const trendText = formatTrendPct(trendPct, locale)
  const balanceSub = trendText ? t(`${P}.kpiBalanceTrend`, { pct: trendText }) : null
  const balanceTone = trendPct > 0 ? 'positive' : trendPct < 0 ? 'negative' : 'neutral'

  const collectedPct = data?.membership_collected_pct
  const feesSub = isMissing(collectedPct)
    ? null
    : t(`${P}.kpiFeesCollected`, { pct: formatPercent(collectedPct, locale) })

  const expensesCount = data?.expenses_this_month_count
  const expensesSub = isMissing(expensesCount)
    ? null
    : t(`${P}.kpiExpensesMonth`, { count: `${expensesCount}` })

  const pending = data?.members_pending_count
  const duesSub = isMissing(pending)
    ? null
    : t(countKey(`${P}.kpiDuesPending`, pending), { count: `${pending}` })

  // Debtors are only listable when the member breakdown is present (admin, or a
  // user at full budget visibility). Otherwise the card stays non-interactive.
  const debtors = (data?.member_accounts || []).filter((member) => member.debt_cents > 0)

  const cards = [
    {
      key: 'balance',
      cents: data?.total_balance_cents,
      label: t(`${P}.kpiBalance`),
      sub: balanceSub,
      subTone: balanceTone,
      icon: 'account_balance',
      accent: theme.palette.secondary.main,
    },
    {
      key: 'fees',
      cents: data?.membership_fees_cents,
      label: t(`${P}.kpiFees`),
      sub: feesSub,
      subTone: 'neutral',
      icon: 'payments',
      accent: theme.palette.info.main,
    },
    {
      key: 'expenses',
      cents: data?.total_expense_cents,
      label: t(`${P}.kpiExpenses`),
      sub: expensesSub,
      subTone: 'neutral',
      icon: 'receipt_long',
      accent: theme.custom.tones.muted,
    },
    {
      key: 'dues',
      cents: data?.outstanding_dues_cents,
      label: t(`${P}.kpiDues`),
      sub: duesSub,
      subTone: pending ? 'negative' : 'neutral',
      icon: 'warning',
      accent: theme.palette.error.main,
      onClick: debtors.length ? () => setDebtorsOpen(true) : undefined,
    },
  ]
  const visibleCards = data ? cards.filter((card) => !isMissing(card.cents)) : cards

  return (
    <>
      <Grid container spacing={1.5}>
        {visibleCards.map((card) => (
          <Grid key={card.key} item xs={12} sm={6} xl={3}>
            <StatCard
              label={card.label}
              value={money(card.cents)}
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
