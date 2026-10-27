import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'

/**
 * Focus return for MUI dialogs that does not trip the browser's
 * "Blocked aria-hidden on an element because its descendant retained focus".
 *
 * MUI v5 restores focus to the opener as soon as `open` turns false, but the app
 * root stays aria-hidden until the exit transition ends, so the browser blocks it.
 * This captures the opener when the dialog opens (layout effect: before the focus
 * trap moves focus inside) and focuses it after the exit transition instead.
 *
 * Spread the returned props into the <Dialog>.
 */
export function useDialogFocusReturn(open) {
  const openerRef = useRef(null)

  useLayoutEffect(() => {
    if (open && typeof document !== 'undefined') {
      openerRef.current = document.activeElement
    }
  }, [open])

  const onExited = useCallback(() => {
    const opener = openerRef.current
    openerRef.current = null
    if (opener?.isConnected && typeof opener.focus === 'function') {
      opener.focus()
    }
  }, [])

  return useMemo(() => ({ disableRestoreFocus: true, TransitionProps: { onExited } }), [onExited])
}
