import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { TX_TYPES, parseAmountToCents, todayIso } from './accountabilityHelpers.js'

// Peach accent shared with the Overview Quick Actions icons (design-system).
const ACCENT = '#FCB491'

const emptyDraft = () => ({
  type: TX_TYPES.INCOME,
  amount: '',
  entity: '',
  concept: '',
  category: '',
  occurred_on: todayIso(),
  player_guid: '',
})

export default function NewTransactionCard({
  t,
  currency,
  playerOptions,
  categoryPresets,
  onRecord,
  submitting,
}) {
  const [draft, setDraft] = useState(emptyDraft)

  const selectedPlayer = useMemo(
    () => playerOptions.find((player) => player.guid === draft.player_guid) || null,
    [playerOptions, draft.player_guid]
  )

  const setField = (field) => (event) =>
    setDraft((current) => ({ ...current, [field]: event.target.value }))

  const handleType = (_event, next) => {
    if (!next) {
      return
    }
    // Member link only applies to income; clear it when switching to expense.
    setDraft((current) => ({
      ...current,
      type: next,
      player_guid: next === TX_TYPES.INCOME ? current.player_guid : '',
    }))
  }

  const handleSubmit = async () => {
    const amountCents = parseAmountToCents(draft.amount)
    const concept = draft.concept.trim()
    if (amountCents === null || amountCents < 0 || !concept) {
      return
    }
    const created = await onRecord({
      type: draft.type,
      amount_cents: amountCents,
      concept,
      occurred_on: draft.occurred_on,
      entity: draft.entity.trim() || null,
      category: draft.category.trim() || null,
      player_guid: draft.type === TX_TYPES.INCOME ? draft.player_guid || null : null,
    })
    if (created) {
      setDraft(emptyDraft())
    }
  }

  const isIncome = draft.type === TX_TYPES.INCOME

  return (
    <Card
      sx={{
        height: '100%',
        // Match the Quick Actions peach accent on this card's text + labels.
        '& .MuiInputLabel-root': { color: ACCENT },
        '& .MuiFormHelperText-root': { color: alpha(ACCENT, 0.7) },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ color: ACCENT }}>
            {t('dashboard.admin.accountability.newTransaction')}
          </Typography>

          <ToggleButtonGroup
            value={draft.type}
            exclusive
            onChange={handleType}
            fullWidth
            size="small"
          >
            <ToggleButton
              value={TX_TYPES.INCOME}
              sx={{ '&.Mui-selected': { color: 'success.main' } }}
            >
              {t('dashboard.admin.accountability.income')}
            </ToggleButton>
            <ToggleButton
              value={TX_TYPES.EXPENSE}
              sx={{ '&.Mui-selected': { color: 'error.main' } }}
            >
              {t('dashboard.admin.accountability.expense')}
            </ToggleButton>
          </ToggleButtonGroup>

          <TextField
            label={t('dashboard.admin.accountability.amount')}
            type="number"
            value={draft.amount}
            onChange={setField('amount')}
            inputProps={{ step: 0.01, min: 0 }}
            InputProps={{
              startAdornment: (
                <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>
                  {currency}
                </Box>
              ),
            }}
            fullWidth
          />

          <TextField
            label={t('dashboard.admin.accountability.entity')}
            placeholder={t('dashboard.admin.accountability.entityPlaceholder')}
            value={draft.entity}
            onChange={setField('entity')}
            fullWidth
          />

          <TextField
            label={t('dashboard.admin.accountability.concept')}
            placeholder={t('dashboard.admin.accountability.conceptPlaceholder')}
            value={draft.concept}
            onChange={setField('concept')}
            fullWidth
          />

          <Autocomplete
            freeSolo
            options={categoryPresets}
            inputValue={draft.category}
            onInputChange={(_event, value) =>
              setDraft((current) => ({ ...current, category: value }))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('dashboard.admin.accountability.category')}
                fullWidth
              />
            )}
          />

          {isIncome ? (
            <Autocomplete
              options={playerOptions}
              value={selectedPlayer}
              getOptionLabel={(option) => option.label || ''}
              isOptionEqualToValue={(option, value) => option.guid === value.guid}
              onChange={(_event, value) =>
                setDraft((current) => ({ ...current, player_guid: value?.guid || '' }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('dashboard.admin.accountability.linkMember')}
                  helperText={t('dashboard.admin.accountability.linkMemberHelp')}
                  fullWidth
                />
              )}
            />
          ) : null}

          <TextField
            type="date"
            label={t('dashboard.admin.accountability.date')}
            InputLabelProps={{ shrink: true }}
            value={draft.occurred_on}
            onChange={setField('occurred_on')}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            fullWidth
          >
            {t('dashboard.admin.accountability.recordTransaction')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
