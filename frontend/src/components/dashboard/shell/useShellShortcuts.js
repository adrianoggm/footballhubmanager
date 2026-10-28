import { useEffect, useRef } from 'react'
import { createSequenceMatcher, isTypingTarget, parseShortcut } from './shellLogic.js'

/**
 * Global dashboard shortcuts: Ctrl/⌘+K runs `onCommandPalette`, and two-key
 * sequences ("G R", "N P") run their binding. Sequences are ignored while
 * typing in a field, with a modifier held, or while `suspended` (e.g. a dialog
 * is open). `bindings`: [{ shortcut: 'G R', run }].
 */
export function useShellShortcuts({ bindings = [], onCommandPalette, suspended = false }) {
  const latest = useRef({ bindings, onCommandPalette, suspended })
  latest.current = { bindings, onCommandPalette, suspended }

  const signature = bindings.map((binding) => binding.shortcut).join('|')

  useEffect(() => {
    const matcher = createSequenceMatcher(
      latest.current.bindings
        .map((binding) => ({ keys: parseShortcut(binding.shortcut), shortcut: binding.shortcut }))
        .filter((binding) => binding.keys.length > 1)
    )

    const onKeyDown = (event) => {
      const current = latest.current
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key?.toLowerCase() === 'k') {
        event.preventDefault()
        current.onCommandPalette?.()
        return
      }
      if (
        current.suspended ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTypingTarget(event.target) ||
        // Inside an open dialog/menu the keys belong to that surface.
        event.target?.closest?.('[role="dialog"], [role="menu"], [role="listbox"]') ||
        !event.key ||
        event.key.length !== 1
      ) {
        return
      }
      const match = matcher.feed(event.key, Date.now())
      if (!match) {
        return
      }
      const binding = current.bindings.find((item) => item.shortcut === match.shortcut)
      if (binding?.run) {
        event.preventDefault()
        binding.run()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [signature])
}
