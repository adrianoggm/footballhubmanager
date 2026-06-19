import { createContext, useContext } from 'react'

// Shared toast/snackbar context. The ToastProvider owns a single auto-hiding
// Snackbar and exposes imperative helpers so any section can confirm a save or
// surface an error without rendering its own inline Alert.
//
// Value shape:
//   {
//     showToast: (message: string, severity?: 'success'|'error'|'info'|'warning', options?: { duration?: number }) => void,
//     success: (message, options?) => void,
//     error:   (message, options?) => void,
//     info:    (message, options?) => void,
//     warning: (message, options?) => void,
//   }
export const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
