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
import { centsToAmount, formatMoney, monthLabel } from './accountabilityHelpers.js'

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

export default function CashFlowDialog({
  open,
  onClose,
  t,
  formatter,
  monthly,
  openingBalanceCents,
  reserveCents,
}) {
  const theme = useTheme()
  const data = (monthly || []).map((row) => ({
    label: monthLabel(row.year, row.month),
    income: centsToAmount(row.income_cents),
    expense: centsToAmount(row.expense_cents),
  }))

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('dashboard.admin.accountability.cashflowTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.accountability.cashflowDescription')}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Figure
                label={t('dashboard.admin.accountability.openingBalance')}
                value={formatMoney(formatter, openingBalanceCents)}
              />
            </Grid>
            <Grid item xs={6}>
              <Figure
                label={t('dashboard.admin.accountability.reserveFund')}
                value={formatMoney(formatter, reserveCents)}
              />
            </Grid>
          </Grid>

          {data.length ? (
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
                  <YAxis tick={{ fontSize: 12, fill: theme.palette.text.secondary }} width={72} />
                  <Tooltip
                    formatter={(value) => formatter.format(value)}
                    contentStyle={{
                      background: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name={t('dashboard.admin.accountability.income')}
                    fill={theme.palette.success.main}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name={t('dashboard.admin.accountability.expense')}
                    fill={theme.palette.error.main}
                    radius={[4, 4, 0, 0]}
                  />
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
