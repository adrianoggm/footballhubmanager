// MUI marks a closing dialog aria-hidden while the button that closed it still
// has focus, and Chrome logs "Blocked aria-hidden on an element because its
// descendant retained focus". Dropping focus before closing avoids it.
export const blurActiveElement = () => {
  if (typeof document === 'undefined') {
    return
  }
  const active = document.activeElement
  if (active && active !== document.body && typeof active.blur === 'function') {
    active.blur()
  }
}
