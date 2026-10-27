import { Box, Dialog, DialogContent, DialogTitle, Grid, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  centsToAmount,
  createAxisMoneyFormatter,
  formatMoney,
  monthLabel,
} from './accountabilityHelpers.js'
import { blurActiveElement } from './dialogFocus.js'

const isMissing = (value) => value === null || value === undefined

function Figure({ label, value }) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6">{value}</Typography>
    </Stack>
  )
}

/**
 * Monthly income vs expenses. For members either side may arrive as null (not
 * shared); that series is left out of the chart. Opening balance / reserve are
 * only shown when present.
 */
export default function CashFlowDialog({
  open,
  onClose,
  t,
  formatter,
  currency,
  locale,
  monthly,
  openingBalanceCents,
  reserveCents,
}) {
  const theme = useTheme()
  const rows = monthly || []
  const showIncome = rows.some((row) => !isMissing(row.income_cents))
  const showExpense = rows.some((row) => !isMissing(row.expense_cents))
  const data = rows.map((row) => ({
    label: monthLabel(row.year, row.month, locale),
    income: isMissing(row.income_cents) ? null : centsToAmount(row.income_cents),
    expense: isMissing(row.expense_cents) ? null : centsToAmount(row.expense_cents),
  }))
  const axisFormatter = createAxisMoneyFormatter(currency, locale)

  const figures = [
    { key: 'opening', label: 'openingBalance', cents: openingBalanceCents },
    { key: 'reserve', label: 'reserveFund', cents: reserveCents },
  ].filter((figure) => !isMissing(figure.cents))

  const handleClose = () => {
    blurActiveElement()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>{t('dashboard.admin.accountability.cashflowTitle')}</DialogTitle>
      <DialogContent>
        <Stack useFlexGap spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.accountability.cashflowDescription')}
          </Typography>

          {figures.length ? (
            <Grid container spacing={2}>
              {figures.map((figure) => (
                <Grid key={figure.key} item xs={6}>
                  <Figure
                    label={t(`dashboard.admin.accountability.${figure.label}`)}
                    value={formatMoney(formatter, figure.cents)}
                  />
                </Grid>
              ))}
            </Grid>
          ) : null}

          {data.length && (showIncome || showExpense) ? (
            <Box sx={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={theme.palette.divider}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                    tickFormatter={(value) => axisFormatter.format(value)}
                    width={72}
                  />
                  <Tooltip
                    formatter={(value) => formatter.format(value)}
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  {showIncome ? (
                    <Bar
                      dataKey="income"
                      name={t('dashboard.admin.accountability.income')}
                      fill={theme.palette.success.main}
                      radius={[4, 4, 0, 0]}
                    />
                  ) : null}
                  {showExpense ? (
                    <Bar
                      dataKey="expense"
                      name={t('dashboard.admin.accountability.expense')}
                      fill={theme.palette.error.main}
                      radius={[4, 4, 0, 0]}
                    />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.accountability.noTransactions')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
