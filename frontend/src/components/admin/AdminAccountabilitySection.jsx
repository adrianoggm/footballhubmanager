import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { adminService } from '../../services/adminService.js'

const ACCOUNTABILITY_TRANSPARENCY_LEVELS = ['private', 'summary', 'full']

const todayIso = () => new Date().toISOString().slice(0, 10)

const defaultFundsDraft = () => ({
  balance: '0',
  reserve: '0',
  currency: 'EUR',
})

const defaultMemberDraft = (playerGuid = '') => ({
  player_guid: playerGuid,
  debt: '0',
  contribution: '0',
  note: '',
})

const defaultExpenseDraft = () => ({
  title: '',
  category: 'general',
  amount: '0',
  occurred_on: todayIso(),
  note: '',
})

const centsToAmountString = (value) => {
  const numeric = Number(value || 0)
  return (numeric / 100).toFixed(2)
}

const parseAmountToCents = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return Math.round(numeric * 100)
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }
  return new Date(value).toLocaleString()
}

export default function AdminAccountabilitySection({
  penaGuid,
  players,
  t,
  formatPlayerDisplayName,
}) {
  const [accountability, setAccountability] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [fundsDraft, setFundsDraft] = useState(defaultFundsDraft)
  const [memberDraft, setMemberDraft] = useState(defaultMemberDraft)
  const [expenseDraft, setExpenseDraft] = useState(defaultExpenseDraft)

  const playerOptions = useMemo(
    () =>
      [...(players || [])]
        .map((player) => ({
          guid: player.guid,
          label: formatPlayerDisplayName(player),
        }))
        .filter((player) => player.guid)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [formatPlayerDisplayName, players]
  )

  const playerNamesByGuid = useMemo(
    () => new Map(playerOptions.map((player) => [player.guid, player.label || player.guid])),
    [playerOptions]
  )

  const moneyFormatter = useMemo(() => {
    const currency = accountability?.currency || 'EUR'
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    })
  }, [accountability?.currency])

  const formatMoney = (valueInCents) => moneyFormatter.format(Number(valueInCents || 0) / 100)

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
        const data = await adminService.getPenaAccountability(penaGuid)
        if (!active) {
          return
        }
        setAccountability(data)
        setFundsDraft({
          balance: centsToAmountString(data.balance_cents),
          reserve: centsToAmountString(data.reserve_cents),
          currency: data.currency || 'EUR',
        })
        setMemberDraft(defaultMemberDraft(playerOptions[0]?.guid || ''))
        setExpenseDraft(defaultExpenseDraft())
        setError('')
        setNotice('')
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
  }, [penaGuid, playerOptions, t])

  const persist = async (action, successKey) => {
    if (!penaGuid || !accountability) {
      return false
    }
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const nextData = await action()
      setAccountability(nextData)
      setFundsDraft({
        balance: centsToAmountString(nextData.balance_cents),
        reserve: centsToAmountString(nextData.reserve_cents),
        currency: nextData.currency,
      })
      if (successKey) {
        setNotice(t(successKey))
      }
      return true
    } catch (persistError) {
      setError(persistError?.message || t('dashboard.common.errors.generic'))
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleTransparencyChange = (field) => (event) => {
    const level = event.target.value
    const payloadField = field === 'budget' ? 'budget_visibility' : 'expenses_visibility'
    persist(
      () => adminService.updatePenaAccountability(penaGuid, { [payloadField]: level }),
      'dashboard.admin.accountability.notices.saved'
    )
  }

  const onFundsField = (field) => (event) => {
    setFundsDraft((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSaveFunds = async () => {
    const balanceCents = parseAmountToCents(fundsDraft.balance)
    const reserveCents = parseAmountToCents(fundsDraft.reserve)
    if (balanceCents === null || reserveCents === null || reserveCents < 0) {
      setError(t('dashboard.admin.accountability.errors.invalidAmount'))
      return
    }
    await persist(
      () =>
        adminService.updatePenaAccountability(penaGuid, {
          balance_cents: balanceCents,
          reserve_cents: reserveCents,
          currency: fundsDraft.currency || 'EUR',
        }),
      'dashboard.admin.accountability.notices.saved'
    )
  }

  const onMemberDraftField = (field) => (event) => {
    setMemberDraft((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSaveMemberAccount = async () => {
    const playerGuid = String(memberDraft.player_guid || '').trim()
    const debtCents = parseAmountToCents(memberDraft.debt)
    const contributionCents = parseAmountToCents(memberDraft.contribution)
    if (!playerGuid) {
      setError(t('dashboard.admin.accountability.errors.memberRequired'))
      return
    }
    if (
      debtCents === null ||
      contributionCents === null ||
      debtCents < 0 ||
      contributionCents < 0
    ) {
      setError(t('dashboard.admin.accountability.errors.invalidAmount'))
      return
    }
    const saved = await persist(
      () =>
        adminService.upsertPenaMemberAccount(penaGuid, playerGuid, {
          debt_cents: debtCents,
          contribution_cents: contributionCents,
          note: memberDraft.note,
        }),
      'dashboard.admin.accountability.notices.memberSaved'
    )
    if (saved) {
      setMemberDraft(defaultMemberDraft(playerGuid))
    }
  }

  const handleEditMemberAccount = (entry) => {
    setMemberDraft({
      player_guid: entry.player_guid,
      debt: centsToAmountString(entry.debt_cents),
      contribution: centsToAmountString(entry.contribution_cents),
      note: entry.note || '',
    })
  }

  const handleClearMemberDraft = () => {
    setMemberDraft(defaultMemberDraft(playerOptions[0]?.guid || ''))
  }

  const handleDeleteMemberAccount = async (playerGuid) => {
    const removed = await persist(
      () => adminService.removePenaMemberAccount(penaGuid, playerGuid),
      'dashboard.admin.accountability.notices.memberDeleted'
    )
    if (removed && memberDraft.player_guid === playerGuid) {
      handleClearMemberDraft()
    }
  }

  const onExpenseDraftField = (field) => (event) => {
    setExpenseDraft((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleAddExpense = async () => {
    const title = String(expenseDraft.title || '').trim()
    const amountCents = parseAmountToCents(expenseDraft.amount)
    if (!title) {
      setError(t('dashboard.admin.accountability.errors.expenseTitleRequired'))
      return
    }
    if (amountCents === null || amountCents < 0) {
      setError(t('dashboard.admin.accountability.errors.invalidAmount'))
      return
    }
    const created = await persist(
      () =>
        adminService.createPenaExpense(penaGuid, {
          title,
          category: expenseDraft.category || 'general',
          amount_cents: amountCents,
          occurred_on: expenseDraft.occurred_on,
          note: expenseDraft.note,
      }),
      'dashboard.admin.accountability.notices.expenseAdded'
    )
    if (created) {
      setExpenseDraft(defaultExpenseDraft())
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    await persist(
      () => adminService.deletePenaExpense(penaGuid, expenseId),
      'dashboard.admin.accountability.notices.expenseDeleted'
    )
  }

  const memberAccounts = accountability?.member_accounts || []
  const expenses = accountability?.expenses || []

  const totalDebt = Number(accountability?.total_debt_cents || 0)
  const totalContributions = Number(accountability?.total_contribution_cents || 0)
  const totalExpenses = Number(accountability?.total_expenses_cents || 0)
  const currentCash = Number(accountability?.current_cash_cents || 0)
  const projectedBalance = Number(accountability?.projected_balance_cents || 0)

  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={1}>
              <Typography variant="h6">{t('dashboard.admin.accountability.title')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.accountability.description')}
              </Typography>
              {accountability?.updated_at && (
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.admin.accountability.updatedAt', {
                    value: formatDateTime(accountability.updated_at),
                  })}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      {loading && (
        <Grid item xs={12}>
          <Alert severity="info">{t('dashboard.common.refreshData')}</Alert>
        </Grid>
      )}
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}
      {notice && (
        <Grid item xs={12}>
          <Alert severity="success">{notice}</Alert>
        </Grid>
      )}

      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t('dashboard.admin.accountability.summaryCash')}
            </Typography>
            <Typography variant="h6">{formatMoney(currentCash)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t('dashboard.admin.accountability.summaryDebt')}
            </Typography>
            <Typography variant="h6">{formatMoney(totalDebt)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t('dashboard.admin.accountability.summaryContributions')}
            </Typography>
            <Typography variant="h6">{formatMoney(totalContributions)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t('dashboard.admin.accountability.summaryExpenses')}
            </Typography>
            <Typography variant="h6">{formatMoney(totalExpenses)}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t('dashboard.admin.accountability.summaryProjected')}
            </Typography>
            <Typography variant="h6">{formatMoney(projectedBalance)}</Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">
                {t('dashboard.admin.accountability.transparencyTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.accountability.transparencyDescription')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  select
                  label={t('dashboard.admin.accountability.budgetVisibility')}
                  value={accountability?.transparency?.budget || 'summary'}
                  onChange={handleTransparencyChange('budget')}
                  fullWidth
                >
                  {ACCOUNTABILITY_TRANSPARENCY_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {t(`dashboard.admin.accountability.level${level[0].toUpperCase()}${level.slice(1)}`)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label={t('dashboard.admin.accountability.expensesVisibility')}
                  value={accountability?.transparency?.expenses || 'summary'}
                  onChange={handleTransparencyChange('expenses')}
                  fullWidth
                >
                  {ACCOUNTABILITY_TRANSPARENCY_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {t(`dashboard.admin.accountability.level${level[0].toUpperCase()}${level.slice(1)}`)}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{t('dashboard.admin.accountability.fundsTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.accountability.fundsDescription')}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={t('dashboard.admin.accountability.mainBalance')}
                  type="number"
                  value={fundsDraft.balance}
                  onChange={onFundsField('balance')}
                  inputProps={{ step: 0.01 }}
                  fullWidth
                />
                <TextField
                  label={t('dashboard.admin.accountability.reserveBalance')}
                  type="number"
                  value={fundsDraft.reserve}
                  onChange={onFundsField('reserve')}
                  inputProps={{ step: 0.01, min: 0 }}
                  fullWidth
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  label={t('dashboard.admin.accountability.currency')}
                  value={fundsDraft.currency}
                  onChange={onFundsField('currency')}
                />
                <Button variant="contained" onClick={handleSaveFunds}>
                  {t('dashboard.admin.accountability.saveFunds')}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">
                {t('dashboard.admin.accountability.memberAccountsTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.accountability.memberAccountsDescription')}
              </Typography>

              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField
                    select
                    label={t('dashboard.admin.accountability.memberLabel')}
                    value={memberDraft.player_guid}
                    onChange={onMemberDraftField('player_guid')}
                    fullWidth
                  >
                    {playerOptions.map((player) => (
                      <MenuItem key={player.guid} value={player.guid}>
                        {player.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label={t('dashboard.admin.accountability.debtAmount')}
                    type="number"
                    value={memberDraft.debt}
                    onChange={onMemberDraftField('debt')}
                    inputProps={{ step: 0.01, min: 0 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label={t('dashboard.admin.accountability.contributionAmount')}
                    type="number"
                    value={memberDraft.contribution}
                    onChange={onMemberDraftField('contribution')}
                    inputProps={{ step: 0.01, min: 0 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label={t('dashboard.admin.accountability.note')}
                    value={memberDraft.note}
                    onChange={onMemberDraftField('note')}
                    fullWidth
                  />
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button variant="contained" onClick={handleSaveMemberAccount}>
                  {t('dashboard.admin.accountability.saveMemberAccount')}
                </Button>
                <Button variant="outlined" onClick={handleClearMemberDraft}>
                  {t('dashboard.admin.accountability.clearMemberAccount')}
                </Button>
              </Stack>

              {!memberAccounts.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.accountability.noMemberAccounts')}
                </Typography>
              )}

              {memberAccounts.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.admin.accountability.memberLabel')}</TableCell>
                        <TableCell align="right">
                          {t('dashboard.admin.accountability.debtAmount')}
                        </TableCell>
                        <TableCell align="right">
                          {t('dashboard.admin.accountability.contributionAmount')}
                        </TableCell>
                        <TableCell>{t('dashboard.admin.accountability.note')}</TableCell>
                        <TableCell>{t('dashboard.admin.accountability.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {memberAccounts.map((entry) => {
                        const playerLabel =
                          playerNamesByGuid.get(entry.player_guid) ||
                          entry.player_name ||
                          entry.player_guid
                        return (
                          <TableRow key={entry.player_guid}>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <span>{playerLabel}</span>
                                <Chip
                                  size="small"
                                  label={entry.player_guid}
                                  variant="outlined"
                                  sx={{ maxWidth: 170 }}
                                />
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{formatMoney(entry.debt_cents)}</TableCell>
                            <TableCell align="right">
                              {formatMoney(entry.contribution_cents)}
                            </TableCell>
                            <TableCell>{entry.note || '-'}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => handleEditMemberAccount(entry)}
                                >
                                  {t('dashboard.admin.accountability.edit')}
                                </Button>
                                <Button
                                  size="small"
                                  color="error"
                                  variant="text"
                                  onClick={() => handleDeleteMemberAccount(entry.player_guid)}
                                >
                                  {t('dashboard.admin.accountability.delete')}
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">{t('dashboard.admin.accountability.expensesTitle')}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.accountability.expensesDescription')}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label={t('dashboard.admin.accountability.expenseTitle')}
                    value={expenseDraft.title}
                    onChange={onExpenseDraftField('title')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    label={t('dashboard.admin.accountability.expenseCategory')}
                    value={expenseDraft.category}
                    onChange={onExpenseDraftField('category')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    type="date"
                    label={t('dashboard.admin.accountability.expenseDate')}
                    InputLabelProps={{ shrink: true }}
                    value={expenseDraft.occurred_on}
                    onChange={onExpenseDraftField('occurred_on')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    type="number"
                    label={t('dashboard.admin.accountability.expenseAmount')}
                    value={expenseDraft.amount}
                    onChange={onExpenseDraftField('amount')}
                    inputProps={{ step: 0.01, min: 0 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    variant="contained"
                    onClick={handleAddExpense}
                    sx={{ height: '100%', width: '100%' }}
                  >
                    {t('dashboard.admin.accountability.addExpense')}
                  </Button>
                </Grid>
              </Grid>
              <Box>
                <TextField
                  label={t('dashboard.admin.accountability.note')}
                  value={expenseDraft.note}
                  onChange={onExpenseDraftField('note')}
                  fullWidth
                />
              </Box>

              {!expenses.length && (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.admin.accountability.noExpenses')}
                </Typography>
              )}

              {expenses.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('dashboard.admin.accountability.expenseTitle')}</TableCell>
                        <TableCell>{t('dashboard.admin.accountability.expenseCategory')}</TableCell>
                        <TableCell>{t('dashboard.admin.accountability.expenseDate')}</TableCell>
                        <TableCell align="right">
                          {t('dashboard.admin.accountability.expenseAmount')}
                        </TableCell>
                        <TableCell>{t('dashboard.admin.accountability.note')}</TableCell>
                        <TableCell>{t('dashboard.admin.accountability.actions')}</TableCell>
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
                          <TableCell>
                            <Button
                              size="small"
                              color="error"
                              variant="text"
                              onClick={() => handleDeleteExpense(entry.id)}
                            >
                              {t('dashboard.admin.accountability.delete')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
