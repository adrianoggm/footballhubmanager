import { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Snackbar } from '@mui/material'

import { ToastContext } from '../../context/toastContext.js'

const DEFAULT_DURATION_MS = 4000

/**
 * Global toast provider. Renders one auto-hiding Snackbar+Alert and exposes
 * imperative helpers via `useToast()`. Mount it once, high in the tree (inside
 * the MUI theme provider so Alert colors resolve).
 *
 * ponytail: single snackbar, latest-wins (a new toast replaces the visible one).
 * Add a FIFO queue only if showing several at once becomes a real need.
 */
export default function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const [open, setOpen] = useState(false)
  // Monotonic key so re-firing the same message restarts the Snackbar timer
  // (avoids Date.now()/Math.random() and stays deterministic in tests).
  const keyRef = useRef(0)

  const showToast = useCallback((message, severity = 'success', options = {}) => {
    if (!message) {
      return
    }
    keyRef.current += 1
    setToast({
      key: keyRef.current,
      message,
      severity,
      duration: options.duration ?? DEFAULT_DURATION_MS,
    })
    setOpen(true)
  }, [])

  const handleClose = useCallback((_event, reason) => {
    // Keep the toast visible if the user clicks elsewhere; only time/✕ dismiss it.
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      showToast,
      success: (message, options) => showToast(message, 'success', options),
      error: (message, options) => showToast(message, 'error', options),
      info: (message, options) => showToast(message, 'info', options),
      warning: (message, options) => showToast(message, 'warning', options),
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.key}
        open={open}
        autoHideDuration={toast?.duration ?? DEFAULT_DURATION_MS}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert
            onClose={handleClose}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  )
}
