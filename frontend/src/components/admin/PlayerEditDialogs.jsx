import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import LabelSelect from '../common/LabelSelect.jsx'

/**
 * Edit a player's season registration (role/position labels + W/D/L + quality).
 * Extracted from the AdminDashboard monolith; state stays in the dashboard.
 */
export function EditSeasonPlayerDialog({
  player,
  draft,
  onField,
  onClose,
  onSave,
  penaLabels,
  loading,
  t,
  formatPlayerDisplayName,
}) {
  return (
    <Dialog open={Boolean(player)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dashboard.admin.players.editSeasonPlayerTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {player
            ? t('dashboard.admin.players.editSeasonPlayerDescription', {
                player: formatPlayerDisplayName(player),
              })
            : ''}
        </DialogContentText>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {/* PL-04: every player has a role, so there is no "no role" option. */}
            <LabelSelect
              label={t('dashboard.admin.members.role')}
              value={draft.role}
              onChange={onField('role')}
              options={penaLabels.role_labels}
              kind="role"
              t={t}
            />
            <LabelSelect
              label={t('dashboard.admin.members.position')}
              noneLabel={t('dashboard.admin.members.positionNone')}
              value={draft.position}
              onChange={onField('position')}
              options={penaLabels.position_labels}
              kind="position"
              t={t}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              type="number"
              label={t('dashboard.admin.table.w')}
              value={draft.wins}
              onChange={onField('wins')}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              type="number"
              label={t('dashboard.admin.table.d')}
              value={draft.draws}
              onChange={onField('draws')}
              inputProps={{ min: 0 }}
              fullWidth
            />
            <TextField
              type="number"
              label={t('dashboard.admin.table.l')}
              value={draft.losses}
              onChange={onField('losses')}
              inputProps={{ min: 0 }}
              fullWidth
            />
          </Stack>
          <TextField
            type="number"
            label={t('dashboard.admin.players.qualityLevel')}
            value={draft.quality_level}
            onChange={onField('quality_level')}
            inputProps={{ min: 0, step: 0.1 }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('dashboard.admin.players.cancelEditSeasonPlayer')}
        </Button>
        <Button onClick={onSave} variant="contained" disabled={loading}>
          {t('dashboard.admin.players.saveSeasonPlayer')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * Edit a pena membership (nickname + role/position labels).
 * Extracted from the AdminDashboard monolith; state stays in the dashboard.
 */
export function EditMembershipDialog({
  player,
  draft,
  onField,
  onClose,
  onSave,
  penaLabels,
  loading,
  t,
}) {
  return (
    <Dialog open={Boolean(player)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dashboard.admin.members.editTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {player
            ? t('dashboard.admin.members.editDescription', {
                player: [player.name, player.surname1, player.surname2].filter(Boolean).join(' '),
              })
            : ''}
        </DialogContentText>
        <Stack spacing={1.5}>
          <TextField
            label={t('dashboard.admin.members.nickname')}
            value={draft.nickname}
            onChange={onField('nickname')}
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            {/* PL-04: every player has a role, so there is no "no role" option. */}
            <LabelSelect
              label={t('dashboard.admin.members.role')}
              value={draft.role}
              onChange={onField('role')}
              options={penaLabels.role_labels}
              kind="role"
              t={t}
            />
            <LabelSelect
              label={t('dashboard.admin.members.position')}
              noneLabel={t('dashboard.admin.members.positionNone')}
              value={draft.position}
              onChange={onField('position')}
              options={penaLabels.position_labels}
              kind="position"
              t={t}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('dashboard.admin.members.cancelEdit')}
        </Button>
        <Button onClick={onSave} variant="contained" disabled={loading}>
          {t('dashboard.admin.members.saveEdit')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
