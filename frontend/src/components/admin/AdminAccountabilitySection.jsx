import { Alert, Box, Button, Grid, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminService } from '../../services/adminService.js'
import { LoadingState } from '../common'
import {
  resolveBudgetVisibility,
  resolveExpensesVisibility,
} from '../common/accountabilityVisibility.js'
import AccountabilityKpis from './accountability/AccountabilityKpis.jsx'
import CashFlowDialog from './accountability/CashFlowDialog.jsx'
import ConfirmDialog from './accountability/ConfirmDialog.jsx'
import MembersCard from './accountability/MembersCard.jsx'
import NewTransactionCard from './accountability/NewTransactionCard.jsx'
import TransactionLedger from './accountability/TransactionLedger.jsx'
import TransparencyDialog from './accountability/TransparencyDialog.jsx'
import {
  createMoneyFormatter,
  parseCategoryPresets,
} from './accountability/accountabilityHelpers.js'

const PAGE_SIZE = 8

export default function AdminAccountabilitySection({
  penaGuid,
  players,
  t,
  formatPlayerDisplayName,
}) {
  const [accountability, setAccountability] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [ledger, setLedger] = useState(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [transparencyOpen, setTransparencyOpen] = useState(false)
  const [cashflowOpen, setCashflowOpen] = useState(false)
  // Pending destructive action awaiting confirmation: { message, action }.
  const [confirmState, setConfirmState] = useState(null)

  const playerOptions = useMemo(
    () =>
      [...(players || [])]
        .map((player) => ({ guid: player.guid, label: formatPlayerDisplayName(player) }))
        .filter((player) => player.guid)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [players, formatPlayerDisplayName]
  )

  const categoryPresets = useMemo(
    () => parseCategoryPresets(t('dashboard.admin.accountability.categoryPresets')),
    [t]
  )

  const formatter = useMemo(
    () => createMoneyFormatter(accountability?.currency || 'EUR'),
    [accountability?.currency]
  )

  // Load the summary (KPIs, members, monthly cashflow, settings).
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

  // Load the paginated ledger (separate from the summary).
  useEffect(() => {
    let active = true
    if (!penaGuid) {
      return () => {
        active = false
      }
    }
    ;(async () => {
      try {
        const data = await adminService.listPenaTransactions(penaGuid, {
          page,
          pageSize: PAGE_SIZE,
          type: filter === 'all' ? '' : filter,
        })
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
  }, [penaGuid, filter, page, reloadNonce])

  const refreshLedger = useCallback(() => {
    setPage(1)
    setReloadNonce((value) => value + 1)
  }, [])

  const runMutation = useCallback(
    async (action, successKey, { reloadLedger = false } = {}) => {
      if (!penaGuid) {
        return false
      }
      setSaving(true)
      setError('')
      setNotice('')
      try {
        const data = await action()
        setAccountability(data)
        if (successKey) {
          setNotice(t(successKey))
        }
        if (reloadLedger) {
          refreshLedger()
        }
        return true
      } catch (mutationError) {
        setError(mutationError?.message || t('dashboard.common.errors.generic'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [penaGuid, t, refreshLedger]
  )

  const handleRecord = (payload) =>
    runMutation(
      () => adminService.recordPenaTransaction(penaGuid, payload),
      'dashboard.admin.accountability.notices.transactionAdded',
      { reloadLedger: true }
    )

  const handleDeleteTransaction = (item) =>
    runMutation(
      () => adminService.deletePenaTransaction(penaGuid, item.guid),
      'dashboard.admin.accountability.notices.transactionDeleted',
      { reloadLedger: true }
    )

  const handleSaveMember = (playerGuid, payload) =>
    runMutation(
      () => adminService.upsertPenaMemberAccount(penaGuid, playerGuid, payload),
      'dashboard.admin.accountability.notices.memberSaved'
    )

  const handleDeleteMember = (playerGuid) =>
    runMutation(
      () => adminService.removePenaMemberAccount(penaGuid, playerGuid),
      'dashboard.admin.accountability.notices.memberDeleted'
    )

  // Destructive actions ask before running.
  const askConfirm = (message, action) => setConfirmState({ message, action })
  const handleConfirm = async () => {
    const action = confirmState?.action
    setConfirmState(null)
    if (action) {
      await action()
    }
  }

  const requestDeleteTransaction = (item) =>
    askConfirm(
      t('dashboard.admin.accountability.confirmDeleteTransaction', { concept: item.concept }),
      () => handleDeleteTransaction(item)
    )

  const requestDeleteMember = (playerGuid) =>
    askConfirm(t('dashboard.admin.accountability.confirmDeleteMember'), () =>
      handleDeleteMember(playerGuid)
    )

  const handleTransparencyChange = (field, value) => {
    const payloadField = field === 'budget' ? 'budget_visibility' : 'expenses_visibility'
    runMutation(
      () => adminService.updatePenaAccountability(penaGuid, { [payloadField]: value }),
      'dashboard.admin.accountability.notices.saved'
    )
  }

  const changeFilter = (next) => {
    setFilter(next)
    setPage(1)
  }

  const members = accountability?.member_accounts || []

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="h5" sx={{ color: '#F4EEE8' }}>
            {t('dashboard.admin.accountability.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.accountability.description')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={
              <Box component="span" className="material-symbols-rounded">
                visibility
              </Box>
            }
            onClick={() => setTransparencyOpen(true)}
          >
            {t('dashboard.admin.accountability.transparencyButton')}
          </Button>
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
        </Stack>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {notice ? (
        <Alert severity="success" onClose={() => setNotice('')}>
          {notice}
        </Alert>
      ) : null}
      {loading && !accountability ? <LoadingState /> : null}

      <AccountabilityKpis data={accountability} formatter={formatter} t={t} />

      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={4} sx={{ minWidth: 0 }}>
          <NewTransactionCard
            t={t}
            currency={accountability?.currency || 'EUR'}
            playerOptions={playerOptions}
            categoryPresets={categoryPresets}
            onRecord={handleRecord}
            submitting={saving}
          />
        </Grid>
        <Grid item xs={12} lg={8} sx={{ minWidth: 0 }}>
          <TransactionLedger
            t={t}
            formatter={formatter}
            page={ledger}
            filter={filter}
            onFilterChange={changeFilter}
            onPrev={() => setPage((value) => Math.max(1, value - 1))}
            onNext={() => setPage((value) => value + 1)}
            onDelete={requestDeleteTransaction}
          />
        </Grid>
      </Grid>

      <MembersCard
        t={t}
        formatter={formatter}
        members={members}
        playerOptions={playerOptions}
        onSave={handleSaveMember}
        onDelete={requestDeleteMember}
        saving={saving}
      />

      <TransparencyDialog
        open={transparencyOpen}
        onClose={() => setTransparencyOpen(false)}
        t={t}
        budgetVisibility={resolveBudgetVisibility(accountability)}
        expensesVisibility={resolveExpensesVisibility(accountability)}
        onChange={handleTransparencyChange}
      />
      <CashFlowDialog
        open={cashflowOpen}
        onClose={() => setCashflowOpen(false)}
        t={t}
        formatter={formatter}
        monthly={accountability?.monthly_cashflow || []}
        openingBalanceCents={accountability?.opening_balance_cents || 0}
        reserveCents={accountability?.reserve_cents || 0}
      />
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={t('dashboard.admin.accountability.confirmDeleteTitle')}
        message={confirmState?.message}
        confirmLabel={t('dashboard.admin.accountability.delete')}
        cancelLabel={t('dashboard.admin.accountability.cancel')}
        onConfirm={handleConfirm}
        onClose={() => setConfirmState(null)}
      />
    </Stack>
  )
}
