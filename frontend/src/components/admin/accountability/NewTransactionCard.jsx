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
import { SHELL_TARGETS } from '../../dashboard/shell/focusTarget.js'
import {
  AMOUNT_RULES,
  MAX_TEXT_LENGTH,
  TX_TYPES,
  currencySymbol,
  todayIso,
  validateAmountInput,
} from './accountabilityHelpers.js'

// Accent shared with the Overview Quick Actions icons (theme.custom.tones.accentStrong).
const accentOf = (theme) => theme.custom.tones.accentStrong

const emptyDraft = () => ({
  type: TX_TYPES.INCOME,
  amount: '',
  entity: '',
  concept: '',
  category: '',
  occurred_on: todayIso(),
  player_guid: '',
})

const P = 'dashboard.admin.accountability'

// Field -> validation message key (under `${P}.validation`) or null.
const validateDraft = (draft) => {
  const amount = validateAmountInput(draft.amount, AMOUNT_RULES.POSITIVE)
  return {
    cents: amount.cents,
    errors: {
      amount: amount.error,
      concept: draft.concept.trim() ? null : 'conceptRequired',
      occurred_on: draft.occurred_on ? null : 'dateRequired',
    },
  }
}

export default function NewTransactionCard({
  t,
  currency,
  locale,
  playerOptions,
  categoryPresets,
  onRecord,
  onInvalid,
  submitting,
}) {
  const [draft, setDraft] = useState(emptyDraft)
  const [errors, setErrors] = useState({})

  const selectedPlayer = useMemo(
    () => playerOptions.find((player) => player.guid === draft.player_guid) || null,
    [playerOptions, draft.player_guid]
  )

  const setField = (field) => (event) => {
    const { value } = event.target
    setDraft((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: null }))
  }

  const errorProps = (field) =>
    errors[field] ? { error: true, helperText: t(`${P}.validation.${errors[field]}`) } : {}

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
    const { cents, errors: nextErrors } = validateDraft(draft)
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) {
      onInvalid?.()
      return
    }
    const created = await onRecord({
      type: draft.type,
      amount_cents: cents,
      concept: draft.concept.trim(),
      occurred_on: draft.occurred_on,
      entity: draft.entity.trim() || null,
      category: draft.category.trim() || null,
      player_guid: draft.type === TX_TYPES.INCOME ? draft.player_guid || null : null,
    })
    if (created) {
      setDraft(emptyDraft())
      setErrors({})
    }
  }

  const isIncome = draft.type === TX_TYPES.INCOME

  return (
    <Card
      id={SHELL_TARGETS.newTransaction}
      sx={(theme) => ({
        height: '100%',
        scrollMarginTop: 72,
        // Match the Quick Actions accent on this card's text + labels.
        '& .MuiInputLabel-root:not(.Mui-error)': { color: accentOf(theme) },
        '& .MuiFormHelperText-root:not(.Mui-error)': { color: alpha(accentOf(theme), 0.7) },
      })}
    >
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ color: accentOf }}>
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
            inputProps={{ step: 0.01, min: 0.01 }}
            InputProps={{
              startAdornment: (
                <Box component="span" sx={{ mr: 1, color: 'text.secondary' }}>
                  {currencySymbol(currency, locale)}
                </Box>
              ),
            }}
            {...errorProps('amount')}
            fullWidth
          />

          <TextField
            label={t('dashboard.admin.accountability.entity')}
            placeholder={t('dashboard.admin.accountability.entityPlaceholder')}
            value={draft.entity}
            onChange={setField('entity')}
            inputProps={{ maxLength: MAX_TEXT_LENGTH }}
            fullWidth
          />

          <TextField
            label={t('dashboard.admin.accountability.concept')}
            placeholder={t('dashboard.admin.accountability.conceptPlaceholder')}
            value={draft.concept}
            onChange={setField('concept')}
            inputProps={{ maxLength: MAX_TEXT_LENGTH }}
            {...errorProps('concept')}
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
            {...errorProps('occurred_on')}
            fullWidth
          />

          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            fullWidth
            sx={(theme) => ({
              // Accent fill with the paper-colored text (replaces the
              // orange gradient).
              backgroundImage: 'none',
              backgroundColor: accentOf(theme),
              color: theme.palette.background.paper,
              boxShadow: 'none',
              '&:hover': {
                backgroundImage: 'none',
                backgroundColor: theme.custom.tones.accentHover,
                boxShadow: theme.custom?.shadows?.md,
              },
            })}
          >
            {t('dashboard.admin.accountability.recordTransaction')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
