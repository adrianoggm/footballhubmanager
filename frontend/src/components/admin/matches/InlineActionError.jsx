import { Alert } from '@mui/material'
import { useEffect, useRef } from 'react'

/**
 * Error shown next to the action that produced it (MT-06). The page-level alert
 * sits at the top of the dashboard, off-screen while the user works on a card,
 * so this one is rendered inside the card and scrolled into view when it appears.
 */
export default function InlineActionError({ message }) {
  const ref = useRef(null)

  useEffect(() => {
    if (message) {
      ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
    }
  }, [message])

  if (!message) {
    return null
  }
  return (
    <Alert ref={ref} severity="error">
      {message}
    </Alert>
  )
}
