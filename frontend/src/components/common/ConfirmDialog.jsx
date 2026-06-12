import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'

/**
 * Shared confirmation dialog. Replaces the per-section delete/leave dialogs.
 *
 * Props:
 *  - open, onConfirm, onCancel
 *  - title, description?
 *  - confirmLabel?, cancelLabel?
 *  - destructive?: boolean -> error-colored confirm button (default true)
 *  - loading?: boolean -> disables actions while the action runs
 *  - children?: extra content rendered above the actions
 */
export default function ConfirmDialog({
  open = false,
  onConfirm = () => {},
  onCancel = () => {},
  title = '',
  description = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  children = null,
}) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent>
        {description ? <DialogContentText>{description}</DialogContentText> : null}
        {children}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          variant="contained"
          color={destructive ? 'error' : 'primary'}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
