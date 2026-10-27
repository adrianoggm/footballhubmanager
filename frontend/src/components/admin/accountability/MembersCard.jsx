import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import {
  AMOUNT_RULES,
  centsToAmountString,
  formatMoney,
  validateAmountInput,
} from './accountabilityHelpers.js'

const P = 'dashboard.admin.accountability'
const MAX_NOTE_LENGTH = 255

const emptyAdd = () => ({ player_guid: '', debt: '', contribution: '', note: '' })

// Blank debt/paid mean 0 when adding a member; negatives and absurd values are errors.
const validateAmounts = (draft) => {
  const debt = validateAmountInput(draft.debt === '' ? '0' : draft.debt, AMOUNT_RULES.NON_NEGATIVE)
  const contribution = validateAmountInput(
    draft.contribution === '' ? '0' : draft.contribution,
    AMOUNT_RULES.NON_NEGATIVE
  )
  return {
    debtCents: debt.cents,
    contributionCents: contribution.cents,
    errors: { debt: debt.error, contribution: contribution.error },
  }
}

const hasErrors = (errors) => Object.values(errors).some(Boolean)

export default function MembersCard({
  t,
  formatter,
  members,
  playerOptions,
  onSave,
  onDelete,
  onInvalid,
  saving,
}) {
  const [editingGuid, setEditingGuid] = useState(null)
  const [editDraft, setEditDraft] = useState({ debt: '', contribution: '', note: '' })
  const [editErrors, setEditErrors] = useState({})
  const [addDraft, setAddDraft] = useState(emptyAdd)
  const [addErrors, setAddErrors] = useState({})

  // Members that already have an account are edited in the table, not re-added
  // (adding again silently overwrote their debt/paid).
  const availableOptions = useMemo(() => {
    const withAccount = new Set(members.map((member) => member.player_guid))
    return playerOptions.filter((player) => !withAccount.has(player.guid))
  }, [playerOptions, members])

  const selectedNewPlayer = useMemo(
    () => availableOptions.find((player) => player.guid === addDraft.player_guid) || null,
    [availableOptions, addDraft.player_guid]
  )

  const errorProps = (errors, field) =>
    errors[field] ? { error: true, helperText: t(`${P}.validation.${errors[field]}`) } : {}

  const setAddField = (field) => (event) => {
    const { value } = event.target
    setAddDraft((current) => ({ ...current, [field]: value }))
    setAddErrors((current) => ({ ...current, [field]: null }))
  }

  const setEditField = (field) => (event) => {
    const { value } = event.target
    setEditDraft((current) => ({ ...current, [field]: value }))
    setEditErrors((current) => ({ ...current, [field]: null }))
  }

  const beginEdit = (member) => {
    setEditingGuid(member.player_guid)
    setEditDraft({
      debt: centsToAmountString(member.debt_cents),
      contribution: centsToAmountString(member.contribution_cents),
      note: member.note || '',
    })
    setEditErrors({})
  }

  const cancelEdit = () => {
    setEditingGuid(null)
    setEditErrors({})
  }

  const commitEdit = async (member) => {
    const debt = validateAmountInput(editDraft.debt, AMOUNT_RULES.NON_NEGATIVE)
    const contribution = validateAmountInput(editDraft.contribution, AMOUNT_RULES.NON_NEGATIVE)
    const errors = { debt: debt.error, contribution: contribution.error }
    setEditErrors(errors)
    if (hasErrors(errors)) {
      onInvalid?.()
      return
    }
    const debtCents = debt.cents
    const contributionCents = contribution.cents
    const saved = await onSave(member.player_guid, {
      debt_cents: debtCents,
      contribution_cents: contributionCents,
      note: editDraft.note.trim() || null,
    })
    if (saved) {
      setEditingGuid(null)
    }
  }

  const commitAdd = async () => {
    if (!addDraft.player_guid) {
      return
    }
    const { debtCents, contributionCents, errors } = validateAmounts(addDraft)
    setAddErrors(errors)
    if (hasErrors(errors)) {
      onInvalid?.()
      return
    }
    const saved = await onSave(addDraft.player_guid, {
      debt_cents: debtCents,
      contribution_cents: contributionCents,
      note: addDraft.note.trim() || null,
    })
    if (saved) {
      setAddDraft(emptyAdd())
      setAddErrors({})
    }
  }

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6">{t('dashboard.admin.accountability.membersTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.accountability.membersDescription')}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
              {t('dashboard.admin.accountability.membersManualHint')}
            </Typography>
          </Box>

          {/* Add a member account */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'flex-start' }}
          >
            <Autocomplete
              sx={{ flex: 2, minWidth: 180 }}
              options={availableOptions}
              value={selectedNewPlayer}
              getOptionLabel={(option) => option.label || ''}
              isOptionEqualToValue={(option, value) => option.guid === value.guid}
              onChange={(_event, value) =>
                setAddDraft((current) => ({ ...current, player_guid: value?.guid || '' }))
              }
              renderInput={(params) => (
                <TextField {...params} label={t('dashboard.admin.accountability.member')} />
              )}
            />
            <TextField
              sx={{ flex: 1 }}
              label={t('dashboard.admin.accountability.debt')}
              type="number"
              value={addDraft.debt}
              onChange={setAddField('debt')}
              inputProps={{ step: 0.01, min: 0 }}
              {...errorProps(addErrors, 'debt')}
            />
            <TextField
              sx={{ flex: 1 }}
              label={t('dashboard.admin.accountability.paid')}
              type="number"
              value={addDraft.contribution}
              onChange={setAddField('contribution')}
              inputProps={{ step: 0.01, min: 0 }}
              {...errorProps(addErrors, 'contribution')}
            />
            <TextField
              sx={{ flex: 2 }}
              label={t('dashboard.admin.accountability.note')}
              helperText={t('dashboard.admin.accountability.noteHelp')}
              value={addDraft.note}
              onChange={setAddField('note')}
              inputProps={{ maxLength: MAX_NOTE_LENGTH }}
            />
            <Button
              variant="contained"
              sx={{ mt: { md: 1 } }}
              onClick={commitAdd}
              disabled={saving || !addDraft.player_guid}
            >
              {t('dashboard.admin.accountability.addMember')}
            </Button>
          </Stack>

          {!members.length ? (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.accountability.noMembers')}
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dashboard.admin.accountability.member')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.accountability.debt')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.accountability.paid')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.accountability.net')}</TableCell>
                    <TableCell align="center">
                      {t('dashboard.admin.accountability.editRow')}
                    </TableCell>
                    <TableCell align="right">
                      {t('dashboard.admin.accountability.colActions')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => {
                    const editing = editingGuid === member.player_guid
                    const net =
                      Number(member.contribution_cents || 0) - Number(member.debt_cents || 0)
                    return (
                      <TableRow key={member.player_guid}>
                        <TableCell>
                          <Typography variant="body2">
                            {member.player_name || member.player_guid}
                          </Typography>
                          {editing ? (
                            <TextField
                              size="small"
                              label={t('dashboard.admin.accountability.note')}
                              value={editDraft.note}
                              onChange={setEditField('note')}
                              inputProps={{ maxLength: MAX_NOTE_LENGTH }}
                              sx={{ mt: 1, minWidth: 180 }}
                            />
                          ) : member.note ? (
                            <Typography variant="caption" color="text.secondary">
                              {member.note}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell align="right">
                          {editing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editDraft.debt}
                              onChange={setEditField('debt')}
                              inputProps={{ step: 0.01, min: 0 }}
                              {...errorProps(editErrors, 'debt')}
                              sx={{ width: 110 }}
                            />
                          ) : (
                            formatMoney(formatter, member.debt_cents)
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {editing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editDraft.contribution}
                              onChange={setEditField('contribution')}
                              inputProps={{ step: 0.01, min: 0 }}
                              {...errorProps(editErrors, 'contribution')}
                              sx={{ width: 110 }}
                            />
                          ) : (
                            formatMoney(formatter, member.contribution_cents)
                          )}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ color: net < 0 ? 'error.main' : 'success.main', fontWeight: 600 }}
                        >
                          {formatMoney(formatter, net)}
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={editing}
                            onChange={(event) =>
                              event.target.checked ? beginEdit(member) : cancelEdit()
                            }
                            inputProps={{
                              'aria-label': t('dashboard.admin.accountability.editRow'),
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {editing ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => commitEdit(member)}
                              disabled={saving}
                            >
                              {t('dashboard.admin.accountability.save')}
                            </Button>
                          ) : (
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={t('dashboard.admin.accountability.delete')}
                              onClick={() => onDelete(member.player_guid)}
                            >
                              <Box component="span" className="material-symbols-rounded">
                                delete
                              </Box>
                            </IconButton>
                          )}
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
  )
}
