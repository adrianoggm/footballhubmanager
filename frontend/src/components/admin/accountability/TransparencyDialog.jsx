import {
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

const LEVELS = ['private', 'summary', 'full']

export default function TransparencyDialog({
  open,
  onClose,
  t,
  budgetVisibility,
  expensesVisibility,
  onChange,
}) {
  const levelLabel = (level) =>
    t(`dashboard.admin.accountability.level${level[0].toUpperCase()}${level.slice(1)}`)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dashboard.admin.accountability.transparencyTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.accountability.transparencyDescription')}
          </Typography>
          <TextField
            select
            label={t('dashboard.admin.accountability.budgetVisibility')}
            value={budgetVisibility}
            onChange={(event) => onChange('budget', event.target.value)}
            fullWidth
          >
            {LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {levelLabel(level)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('dashboard.admin.accountability.expensesVisibility')}
            value={expensesVisibility}
            onChange={(event) => onChange('expenses', event.target.value)}
            fullWidth
          >
            {LEVELS.map((level) => (
              <MenuItem key={level} value={level}>
                {levelLabel(level)}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
