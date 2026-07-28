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
import { readableTextColor } from '../../../theme/contrastText.js'
import { DEFAULT_LABEL_COLOR } from '../../../theme/tokens.js'
import { getSurfaceGeometry } from '../../common/surfaceGeometry.js'

// Warm accountability palette (issue #147) — shared with StatCard / PlayerToolbar
// / PlayerList so the Player Directory dialogs read as the same system rather
// than inventing a new visual language.
const SURFACE = '#45342C'
const TEXT_COLOR = '#F4EEE8'
const MUTED = '#88736A'
const ACCENT = '#FCB491'

const labelChipSx = (color) => {
  const background = color || DEFAULT_LABEL_COLOR
  return {
    backgroundColor: background,
    color: readableTextColor(background),
    border: '1px solid rgba(15, 23, 42, 0.12)',
  }
}

// Co-located from AdminPlayersSection (issue #147, task 7): a color picker
// per label, rendered under each role/position labels textarea.
function LabelColorList({ labels, colors, onColorChange }) {
  if (!labels.length) {
    return null
  }

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {labels.map((label) => (
        <Stack
          key={label}
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Chip size="small" label={label} sx={labelChipSx(colors[label])} />
          <TextField
            type="color"
            size="small"
            value={colors[label]}
            onChange={onColorChange(label)}
            sx={{ width: 72 }}
            inputProps={{
              'aria-label': `${label} color`,
            }}
          />
        </Stack>
      ))}
    </Stack>
  )
}

// The textareas bind to the RAW comma/newline separated draft text (so a
// half-typed separator isn't normalized away on every keystroke); the color
// list needs the parsed array. Accept either shape defensively for the array
// side since it's easy to mix the two up when wiring (issue #147, task 8
// regression fix — see the task report for the bug this guards against).
const toLabelsArray = (value) => (Array.isArray(value) ? value : [])

/**
 * Controlled dialog wrapping the "edit classification labels" form previously
 * inline in AdminPlayersSection (issue #147, task 7). Purely presentational:
 * `labelsDraft` (raw text) feeds the textareas via `onLabelsDraftField`, while
 * the parsed `draftRoleLabels`/`draftPositionLabels` arrays are used ONLY to
 * render the per-label color list. The actual save happens in `onSave`, wired
 * by the caller (task 8).
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
  onSave,
  t,
}) {
  const theme = useTheme()
  const geometry = getSurfaceGeometry(theme)

  const accentButtonSx = {
    backgroundImage: 'none',
    backgroundColor: ACCENT,
    color: theme.palette.background.paper,
    boxShadow: 'none',
    '&:hover': {
      backgroundImage: 'none',
      backgroundColor: '#f2a074',
      boxShadow: theme.custom?.shadows?.md,
    },
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { backgroundColor: SURFACE, color: TEXT_COLOR, borderRadius: geometry.surfaceRadius },
      }}
    >
      <DialogTitle sx={{ color: TEXT_COLOR }}>{t('dashboard.admin.labels.title')}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: alpha(TEXT_COLOR, 0.12) }}>
        <Stack spacing={2.5}>
          <Typography variant="body2" sx={{ color: MUTED }}>
            {t('dashboard.admin.labels.description')}
          </Typography>
          <Typography variant="caption" sx={{ color: MUTED }}>
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
              <LabelColorList
                labels={toLabelsArray(draftRoleLabels)}
                colors={draftRoleColors}
                onColorChange={(roleLabel) => onLabelColorDraftChange('role_colors', roleLabel)}
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
              <LabelColorList
                labels={toLabelsArray(draftPositionLabels)}
                colors={draftPositionColors}
                onColorChange={(positionLabel) =>
                  onLabelColorDraftChange('position_colors', positionLabel)
                }
              />
            </Grid>
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: TEXT_COLOR }}>
          {t('dashboard.common.matchDetail.closeAction')}
        </Button>
        <Button variant="contained" onClick={onSave} sx={accentButtonSx}>
          {t('dashboard.admin.labels.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
