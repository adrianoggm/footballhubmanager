import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import MatchDetailViewer from '../MatchDetailViewer.jsx'

/**
 * Read-only match detail dialog (loading / detail / no-data states).
 * Shared by the admin overview and the user matches section — previously
 * duplicated inline in both dashboards.
 */
export default function MatchDetailDialog({ open, onClose, loading, detail, t, formatDate }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>{t('dashboard.common.matchDetail.dialogTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {loading && <LinearProgress />}
          {!loading && detail && <MatchDetailViewer detail={detail} t={t} formatDate={formatDate} />}
          {!loading && !detail && (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.common.matchDetail.noData')}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('dashboard.common.matchDetail.closeAction')}</Button>
      </DialogActions>
    </Dialog>
  )
}
