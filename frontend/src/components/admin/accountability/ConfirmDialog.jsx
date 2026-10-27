import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { blurActiveElement } from './dialogFocus.js'

/**
 * Minimal confirmation gate for destructive actions. `open` is derived from the
 * caller holding a pending action; onConfirm runs it, onClose cancels.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}) {
  const handleClose = () => {
    blurActiveElement()
    onClose()
  }
  const handleConfirm = () => {
    blurActiveElement()
    onConfirm()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{cancelLabel}</Button>
        <Button color="error" variant="contained" onClick={handleConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
