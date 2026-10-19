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
import { centsToAmountString, formatMoney, parseAmountToCents } from './accountabilityHelpers.js'

const emptyAdd = () => ({ player_guid: '', debt: '', contribution: '', note: '' })

export default function MembersCard({
  t,
  formatter,
  members,
  playerOptions,
  onSave,
  onDelete,
  saving,
}) {
  const [editingGuid, setEditingGuid] = useState(null)
  const [editDraft, setEditDraft] = useState({ debt: '', contribution: '', note: '' })
  const [addDraft, setAddDraft] = useState(emptyAdd)

  const selectedNewPlayer = useMemo(
    () => playerOptions.find((player) => player.guid === addDraft.player_guid) || null,
    [playerOptions, addDraft.player_guid]
  )

  const beginEdit = (member) => {
    setEditingGuid(member.player_guid)
    setEditDraft({
      debt: centsToAmountString(member.debt_cents),
      contribution: centsToAmountString(member.contribution_cents),
      note: member.note || '',
    })
  }

  const cancelEdit = () => {
    setEditingGuid(null)
  }

  const commitEdit = async (member) => {
    const debtCents = parseAmountToCents(editDraft.debt)
    const contributionCents = parseAmountToCents(editDraft.contribution)
    if (
      debtCents === null ||
      contributionCents === null ||
      debtCents < 0 ||
      contributionCents < 0
    ) {
      return
    }
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
    const debtCents = parseAmountToCents(addDraft.debt || '0')
    const contributionCents = parseAmountToCents(addDraft.contribution || '0')
    if (
      debtCents === null ||
      contributionCents === null ||
      debtCents < 0 ||
      contributionCents < 0
    ) {
      return
    }
    const saved = await onSave(addDraft.player_guid, {
      debt_cents: debtCents,
      contribution_cents: contributionCents,
      note: addDraft.note.trim() || null,
    })
    if (saved) {
      setAddDraft(emptyAdd())
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
          </Box>

          {/* Add a member account */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'center' }}
          >
            <Autocomplete
              sx={{ flex: 2, minWidth: 180 }}
              options={playerOptions}
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
              onChange={(event) =>
                setAddDraft((current) => ({ ...current, debt: event.target.value }))
              }
              inputProps={{ step: 0.01, min: 0 }}
            />
            <TextField
              sx={{ flex: 1 }}
              label={t('dashboard.admin.accountability.paid')}
              type="number"
              value={addDraft.contribution}
              onChange={(event) =>
                setAddDraft((current) => ({ ...current, contribution: event.target.value }))
              }
              inputProps={{ step: 0.01, min: 0 }}
            />
            <Button
              variant="contained"
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
                        <TableCell>{member.player_name || member.player_guid}</TableCell>
                        <TableCell align="right">
                          {editing ? (
                            <TextField
                              size="small"
                              type="number"
                              value={editDraft.debt}
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  debt: event.target.value,
                                }))
                              }
                              inputProps={{ step: 0.01, min: 0 }}
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
                              onChange={(event) =>
                                setEditDraft((current) => ({
                                  ...current,
                                  contribution: event.target.value,
                                }))
                              }
                              inputProps={{ step: 0.01, min: 0 }}
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
