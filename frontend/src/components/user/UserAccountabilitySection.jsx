import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import { alpha } from '@mui/material/styles'
import { useEffect, useMemo, useState } from 'react'
import { userService } from '../../services/userService.js'
import { LoadingState } from '../common'
import {
  resolveBudgetVisibility,
  resolveExpensesVisibility,
} from '../common/accountabilityVisibility.js'
import AccountabilityKpis from '../admin/accountability/AccountabilityKpis.jsx'
import CashFlowDialog from '../admin/accountability/CashFlowDialog.jsx'
import TransactionLedger from '../admin/accountability/TransactionLedger.jsx'
import { createMoneyFormatter, formatMoney } from '../admin/accountability/accountabilityHelpers.js'

const PAGE_SIZE = 8

const visibilityTone = (level) =>
  level === 'full' ? 'success' : level === 'summary' ? 'info' : 'default'

const visibilityLabelKey = (scope) =>
  `dashboard.user.accountability.visibility${scope[0].toUpperCase()}${scope.slice(1)}`

export default function UserAccountabilitySection({ penaGuid, currentPlayerGuid, t }) {
  const [accountability, setAccountability] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [cashflowOpen, setCashflowOpen] = useState(false)

  useEffect(() => {
    let active = true
    if (!penaGuid) {
      setAccountability(null)
      return () => {
        active = false
      }
    }
    setLoading(true)
    ;(async () => {
      try {
        const data = await userService.getPenaAccountability(penaGuid)
        if (active) {
          setAccountability(data)
          setError('')
        }
      } catch (loadError) {
        if (active) {
          setError(loadError?.message || t('dashboard.common.errors.generic'))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [penaGuid, t])

  useEffect(() => {
    let active = true
    if (!penaGuid) {
      return () => {
        active = false
      }
    }
    ;(async () => {
      try {
        const data = await userService.listPenaTransactions(penaGuid, { page, pageSize: PAGE_SIZE })
        if (active) {
          setLedger(data)
        }
      } catch {
        if (active) {
          setLedger({ items: [], page: 1, page_size: PAGE_SIZE, total: 0, total_pages: 0 })
        }
      }
    })()
    return () => {
      active = false
    }
  }, [penaGuid, page])

  const formatter = useMemo(
    () => createMoneyFormatter(accountability?.currency || 'EUR'),
    [accountability?.currency]
  )

  const budgetVisibility = resolveBudgetVisibility(accountability)
  const expensesVisibility = resolveExpensesVisibility(accountability)
  const myAccount = accountability?.my_account || null
  const members = accountability?.member_accounts || []
  const myNet = myAccount
    ? Number(myAccount.contribution_cents || 0) - Number(myAccount.debt_cents || 0)
    : 0

  return (
    <Stack spacing={2.5}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {loading && !accountability ? <LoadingState /> : null}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="h6">{t('dashboard.user.accountabilityTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.user.accountability.description')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
            <Chip
              size="small"
              color={visibilityTone(budgetVisibility)}
              label={`${t('dashboard.user.accountability.budgetVisibility')}: ${t(visibilityLabelKey(budgetVisibility))}`}
            />
            <Chip
              size="small"
              color={visibilityTone(expensesVisibility)}
              label={`${t('dashboard.user.accountability.expensesVisibility')}: ${t(visibilityLabelKey(expensesVisibility))}`}
            />
          </Stack>
        </Box>
        {budgetVisibility !== 'private' ? (
          <Button
            variant="outlined"
            startIcon={
              <Box component="span" className="material-symbols-rounded">
                insights
              </Box>
            }
            onClick={() => setCashflowOpen(true)}
          >
            {t('dashboard.admin.accountability.cashflowButton')}
          </Button>
        ) : null}
      </Stack>

      {/* Personal standing */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t('dashboard.user.accountability.myDebt')}
              </Typography>
              <Typography variant="h6">
                {formatMoney(formatter, myAccount?.debt_cents || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t('dashboard.user.accountability.myContribution')}
              </Typography>
              <Typography variant="h6">
                {formatMoney(formatter, myAccount?.contribution_cents || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t('dashboard.user.accountability.myNet')}
              </Typography>
              <Typography variant="h6" sx={{ color: myNet < 0 ? 'error.main' : 'success.main' }}>
                {formatMoney(formatter, myNet)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {budgetVisibility === 'private' ? (
        <Alert severity="info">{t('dashboard.user.accountability.privateMessage')}</Alert>
      ) : (
        <AccountabilityKpis data={accountability} formatter={formatter} t={t} />
      )}

      <TransactionLedger
        t={t}
        formatter={formatter}
        page={ledger}
        showFilter={false}
        readOnly
        onPrev={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => value + 1)}
      />

      {budgetVisibility === 'full' && members.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">
                {t('dashboard.user.accountability.membersTableTitle')}
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('dashboard.user.accountability.member')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.accountability.debt')}</TableCell>
                      <TableCell align="right">{t('dashboard.user.accountability.paid')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((entry) => (
                      <TableRow
                        key={entry.player_guid}
                        sx={
                          entry.player_guid === currentPlayerGuid
                            ? (theme) => ({
                                '& td': { backgroundColor: alpha(theme.palette.info.main, 0.12) },
                              })
                            : undefined
                        }
                      >
                        <TableCell>{entry.player_name || entry.player_guid}</TableCell>
                        <TableCell align="right">
                          {formatMoney(formatter, entry.debt_cents)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMoney(formatter, entry.contribution_cents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <CashFlowDialog
        open={cashflowOpen}
        onClose={() => setCashflowOpen(false)}
        t={t}
        formatter={formatter}
        monthly={accountability?.monthly_cashflow || []}
        openingBalanceCents={accountability?.opening_balance_cents || 0}
        reserveCents={accountability?.reserve_cents || 0}
      />
    </Stack>
  )
}
