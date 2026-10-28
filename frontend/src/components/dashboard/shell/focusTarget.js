// Shell shortcuts ("New match", "New transaction") navigate to a section and
// then bring its existing create form into view. Sections are lazy, so the
// target is polled for a short while after navigation.

export const SHELL_TARGETS = Object.freeze({
  createMatch: 'shell-target-create-match',
  newTransaction: 'shell-target-new-transaction',
})

const FOCUSABLE = 'input:not([type="hidden"]):not([disabled]), textarea, select, button'

/** Scrolls to `#elementId` once it exists and focuses its first field. */
export function revealShellTarget(elementId, { timeoutMs = 4000 } = {}) {
  if (typeof window === 'undefined') {
    return
  }
  const startedAt = Date.now()
  const attempt = () => {
    const node = document.getElementById(elementId)
    if (node) {
      node.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
      node.querySelector(FOCUSABLE)?.focus({ preventScroll: true })
      return
    }
    if (Date.now() - startedAt < timeoutMs) {
      window.requestAnimationFrame(attempt)
    }
  }
  window.requestAnimationFrame(attempt)
}
