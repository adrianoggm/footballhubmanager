import {
  Alert,
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
import { useEffect, useMemo, useState } from 'react'
import { userService } from '../../services/userService.js'
import { LoadingState } from '../common'

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

const visibilityTone = (level) => {
  if (level === 'full') {
    return 'success'
  }
  if (level === 'summary') {
    return 'info'
  }
  return 'default'
}

const visibilityLabelKey = (scope) =>
  `dashboard.user.accountability.visibility${scope[0].toUpperCase()}${scope.slice(1)}`

export default function UserAccountabilitySection({ penaGuid, currentPlayerGuid, t }) {
  const [accountability, setAccountability] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        const response = await userService.getPenaAccountability(penaGuid)
        if (!active) {
          return
        }
        setAccountability(response)
        setError('')
      } catch (loadError) {
        if (!active) {
          return
        }
        setError(loadError?.message || t('dashboard.common.errors.generic'))
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

  const moneyFormatter = useMemo(() => {
    const currency = accountability?.currency || 'EUR'
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    })
  }, [accountability?.currency])

  const formatMoney = (valueInCents) => moneyFormatter.format(Number(valueInCents || 0) / 100)

  const memberAccounts = accountability?.member_accounts || []
  const expenses = accountability?.expenses || []
  const budgetVisibility = accountability?.transparency?.budget || 'summary'
  const expensesVisibility = accountability?.transparency?.expenses || 'summary'
  const myAccount =
    accountability?.my_account ||
    memberAccounts.find((entry) => entry.player_guid === currentPlayerGuid) ||
    null

  const totalDebt = memberAccounts.reduce((sum, entry) => sum + Number(entry.debt_cents || 0), 0)
  const totalContributions = memberAccounts.reduce(
    (sum, entry) => sum + Number(entry.contribution_cents || 0),
    0
  )
  const totalExpenses = expenses.reduce((sum, entry) => sum + Number(entry.amount_cents || 0), 0)
  const currentCash =
    Number(accountability?.balance_cents || 0) + totalContributions - totalExpenses
  const projectedBalance = currentCash + totalDebt

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LoadingState />}

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.25}>
            <Typography variant="subtitle2">{t('dashboard.user.accountabilityTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.user.accountability.description')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
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
            {accountability?.updated_at && (
              <Typography variant="caption" color="text.secondary">
                {t('dashboard.user.accountability.updatedAt', {
                  value: formatDateTime(accountability.updated_at),
                })}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.myDebt')}
                </Typography>
                <Typography variant="h6">{formatMoney(myAccount?.debt_cents || 0)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.myContribution')}
                </Typography>
                <Typography variant="h6">
                  {formatMoney(myAccount?.contribution_cents || 0)}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={0.5}>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.myNet')}
                </Typography>
                <Typography variant="h6">
                  {formatMoney(
                    Number(myAccount?.contribution_cents || 0) - Number(myAccount?.debt_cents || 0)
                  )}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {budgetVisibility === 'private' ? (
        <Alert severity="info">{t('dashboard.user.accountability.privateMessage')}</Alert>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.totalCash')}
                </Typography>
                <Typography variant="h6">{formatMoney(currentCash)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.totalReserve')}
                </Typography>
                <Typography variant="h6">
                  {formatMoney(accountability?.reserve_cents || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.totalDebt')}
                </Typography>
                <Typography variant="h6">{formatMoney(totalDebt)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.totalContributions')}
                </Typography>
                <Typography variant="h6">{formatMoney(totalContributions)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.totalExpenses')}
                </Typography>
                <Typography variant="h6">{formatMoney(totalExpenses)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.projectedBalance')}
                </Typography>
                <Typography variant="h6">{formatMoney(projectedBalance)}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {budgetVisibility === 'full' && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">
                {t('dashboard.user.accountability.membersTableTitle')}
              </Typography>
              {!memberAccounts.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.user.accountability.noMemberAccounts')}
                </Typography>
              )}
              {memberAccounts.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.user.accountability.member')}</TableCell>
                        <TableCell align="right">
                          {t('dashboard.user.accountability.debt')}
                        </TableCell>
                        <TableCell align="right">
                          {t('dashboard.user.accountability.paid')}
                        </TableCell>
                        <TableCell>{t('dashboard.user.accountability.note')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberAccounts.map((entry) => (
                        <TableRow
                          key={entry.player_guid}
                          sx={
                            entry.player_guid === currentPlayerGuid
                              ? { '& td': { backgroundColor: 'rgba(14, 165, 233, 0.08)' } }
                              : undefined
                          }
                        >
                          <TableCell>{entry.player_name || entry.player_guid}</TableCell>
                          <TableCell align="right">{formatMoney(entry.debt_cents)}</TableCell>
                          <TableCell align="right">
                            {formatMoney(entry.contribution_cents)}
                          </TableCell>
                          <TableCell>{entry.note || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {expensesVisibility === 'private' ? (
        <Alert severity="info">{t('dashboard.user.accountability.privateMessage')}</Alert>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.totalExpenses')}
                </Typography>
                <Typography variant="h6">{formatMoney(totalExpenses)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t('dashboard.user.accountability.expensesEntries')}
                </Typography>
                <Typography variant="h6">{expenses.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {expensesVisibility === 'full' && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">
                {t('dashboard.user.accountability.expensesTableTitle')}
              </Typography>
              {!expenses.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.user.accountability.noExpenses')}
                </Typography>
              )}
              {expenses.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.user.accountability.expense')}</TableCell>
                        <TableCell>{t('dashboard.user.accountability.category')}</TableCell>
                        <TableCell>{t('dashboard.user.accountability.date')}</TableCell>
                        <TableCell align="right">
                          {t('dashboard.user.accountability.amount')}
                        </TableCell>
                        <TableCell>{t('dashboard.user.accountability.note')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {expenses.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>{entry.title}</TableCell>
                          <TableCell>{entry.category || '-'}</TableCell>
                          <TableCell>{entry.occurred_on}</TableCell>
                          <TableCell align="right">{formatMoney(entry.amount_cents)}</TableCell>
                          <TableCell>{entry.note || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}
