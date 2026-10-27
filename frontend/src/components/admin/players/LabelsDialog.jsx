import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { useI18n } from '../../../i18n/useI18n.js'
import { translatePlural } from '../../../i18n/plural.js'
import { readableTextColor } from '../../../theme/contrastText.js'
import { DEFAULT_LABEL_COLOR } from '../../../theme/tokens.js'
import ConfirmDialog from '../../common/ConfirmDialog.jsx'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'
import { countLabelUsage, findRemovedLabelsInUse, validateRename } from './labelsHelpers.js'

// Admin palette (issue #147) comes from theme.custom.surfaces/tones so the
// Player Directory follows the active preset (Ember keeps the warm look, #70).

const labelChipSx = (color) => {
  const background = color || DEFAULT_LABEL_COLOR
  return {
    backgroundColor: background,
    color: readableTextColor(background),
    border: '1px solid rgba(15, 23, 42, 0.12)',
  }
}

const USAGE_KEY = 'dashboard.admin.labels.usage'

// One editable row per label: colour picker, how many players use it and an
// in-place rename (PL-03) that keeps the label's colour and its players.
function LabelRow({ label, color, usage, labels, onColorChange, onRename, t, language }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const problem = editing ? validateRename(labels, label, draft) : ''

  const startEditing = () => {
    setDraft(label)
    setEditing(true)
  }
  const apply = () => {
    if (problem) return
    if (draft.trim() !== label) onRename(label, draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              apply()
            }
          }}
          error={Boolean(problem)}
          helperText={problem ? t('dashboard.admin.labels.renameInvalid') : undefined}
          inputProps={{ 'aria-label': t('dashboard.admin.labels.renameField', { label }) }}
          fullWidth
        />
        <Button size="small" onClick={apply} disabled={Boolean(problem)}>
          {t('dashboard.admin.labels.renameApply')}
        </Button>
        <Button size="small" color="inherit" onClick={() => setEditing(false)}>
          {t('dashboard.admin.labels.renameCancel')}
        </Button>
      </Stack>
    )
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Chip size="small" label={label} sx={labelChipSx(color)} />
        <Typography variant="caption" sx={{ opacity: 0.75, whiteSpace: 'nowrap' }}>
          {translatePlural(t, language, USAGE_KEY, usage)}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Button
          size="small"
          onClick={startEditing}
          aria-label={t('dashboard.admin.labels.renameAction', { label })}
        >
          <span className="material-symbols-rounded" aria-hidden="true">
            edit
          </span>
        </Button>
        <TextField
          type="color"
          size="small"
          value={color}
          onChange={onColorChange(label)}
          sx={{ width: 72 }}
          inputProps={{
            'aria-label': `${label} color`,
          }}
        />
      </Stack>
    </Stack>
  )
}

function LabelList({ labels, colors, players, field, onColorChange, onRename, t, language }) {
  if (!labels.length) {
    return null
  }
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {labels.map((label) => (
        <LabelRow
          key={label}
          label={label}
          color={colors[label]}
          usage={countLabelUsage(players, field, label)}
          labels={labels}
          onColorChange={onColorChange}
          onRename={onRename}
          t={t}
          language={language}
        />
      ))}
    </Stack>
  )
}

// The textareas bind to the RAW comma/newline separated draft text (so a
// half-typed separator isn't normalized away on every keystroke); the label
// rows need the parsed array. Accept either shape defensively for the array
// side since it's easy to mix the two up when wiring (issue #147, task 8
// regression fix — see the task report for the bug this guards against).
const toLabelsArray = (value) => (Array.isArray(value) ? value : [])

/**
 * Controlled dialog wrapping the "edit classification labels" form previously
 * inline in AdminPlayersSection (issue #147, task 7). `labelsDraft` (raw text)
 * feeds the textareas via `onLabelsDraftField`, while the parsed
 * `draftRoleLabels`/`draftPositionLabels` arrays render the per-label rows.
 *
 * PL-03: each row shows how many `players` use the label and offers an
 * in-place rename (`onRenameLabel(kind, old, new)`). Saving a draft that drops
 * labels still in use (vs `previousLabels`) asks for confirmation first.
 */
export default function LabelsDialog({
  open,
  onClose,
  labelsDraft,
  draftRoleLabels,
  draftPositionLabels,
  draftRoleColors,
  draftPositionColors,
  onLabelsDraftField,
  onLabelColorDraftChange,
  onRenameLabel = () => {},
  previousLabels = { role_labels: [], position_labels: [] },
  players = [],
  onSave,
  t,
}) {
  const theme = useTheme()
  const { language } = useI18n()
  const [pendingRemovals, setPendingRemovals] = useState(null)
  const { surfaces, tones } = theme.custom
  const surface = surfaces.raised
  const textColor = tones.onRaised
  const muted = tones.muted
  const accent = tones.accentStrong
  const geometry = getSurfaceGeometry(theme)

  const roleLabels = toLabelsArray(draftRoleLabels)
  const positionLabels = toLabelsArray(draftPositionLabels)

  const accentButtonSx = {
    backgroundImage: 'none',
    backgroundColor: accent,
    color: theme.palette.background.paper,
    boxShadow: 'none',
    '&:hover': {
      backgroundImage: 'none',
      backgroundColor: tones.accentHover,
      boxShadow: theme.custom?.shadows?.md,
    },
  }

  const handleSave = () => {
    const removals = [
      ...findRemovedLabelsInUse({
        previous: previousLabels.role_labels,
        next: roleLabels,
        renames: labelsDraft.role_renames,
        players,
        field: 'role',
      }),
      ...findRemovedLabelsInUse({
        previous: previousLabels.position_labels,
        next: positionLabels,
        renames: labelsDraft.position_renames,
        players,
        field: 'position',
      }),
    ]
    if (removals.length) {
      setPendingRemovals(removals)
      return
    }
    onSave()
  }

  const confirmRemovals = () => {
    setPendingRemovals(null)
    onSave()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { backgroundColor: surface, color: textColor, borderRadius: geometry.surfaceRadius },
      }}
    >
      <DialogTitle sx={{ color: textColor }}>{t('dashboard.admin.labels.title')}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(textColor, 0.12) }}>
        <Stack useFlexGap spacing={2.5}>
          <Typography variant="body2" sx={{ color: muted }}>
            {t('dashboard.admin.labels.description')}
          </Typography>
          <Typography variant="caption" sx={{ color: muted }}>
            {t('dashboard.admin.labels.colorHelper')}
          </Typography>

          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <TextField
                label={t('dashboard.admin.labels.roleLabels')}
                value={labelsDraft.role_labels}
                onChange={onLabelsDraftField('role_labels')}
                helperText={t('dashboard.admin.labels.inputHelper')}
                multiline
                minRows={2}
                fullWidth
              />
              <LabelList
                labels={roleLabels}
                colors={draftRoleColors}
                players={players}
                field="role"
                onColorChange={(roleLabel) => onLabelColorDraftChange('role_colors', roleLabel)}
                onRename={(oldLabel, newLabel) => onRenameLabel('role', oldLabel, newLabel)}
                t={t}
                language={language}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label={t('dashboard.admin.labels.positionLabels')}
                value={labelsDraft.position_labels}
                onChange={onLabelsDraftField('position_labels')}
                helperText={t('dashboard.admin.labels.inputHelper')}
                multiline
                minRows={2}
                fullWidth
              />
              <LabelList
                labels={positionLabels}
                colors={draftPositionColors}
                players={players}
                field="position"
                onColorChange={(positionLabel) =>
                  onLabelColorDraftChange('position_colors', positionLabel)
                }
                onRename={(oldLabel, newLabel) => onRenameLabel('position', oldLabel, newLabel)}
                t={t}
                language={language}
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: textColor }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button variant="contained" onClick={handleSave} sx={accentButtonSx}>
          {t('dashboard.admin.labels.save')}
        </Button>
      </DialogActions>

      <ConfirmDialog
        open={Boolean(pendingRemovals)}
        onCancel={() => setPendingRemovals(null)}
        onConfirm={confirmRemovals}
        title={t('dashboard.admin.labels.removeTitle')}
        description={t('dashboard.admin.labels.removeDescription')}
        cancelLabel={t('dashboard.admin.labels.removeCancel')}
        confirmLabel={t('dashboard.admin.labels.removeConfirm')}
      >
        <Stack component="ul" spacing={0.5} sx={{ mt: 1.5, mb: 0, pl: 2.5 }}>
          {(pendingRemovals || []).map(({ label, count }) => (
            <Typography component="li" variant="body2" key={label}>
              {t('dashboard.admin.labels.removeItem', {
                label,
                usage: translatePlural(t, language, USAGE_KEY, count),
              })}
            </Typography>
          ))}
        </Stack>
      </ConfirmDialog>
    </Dialog>
  )
}
