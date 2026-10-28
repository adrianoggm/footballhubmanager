import { Box, Dialog, InputBase, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../../i18n/useI18n.js'
import ShellIcon from './ShellIcon.jsx'
import { Kbd } from './shellParts.jsx'
import { filterCommandItems, parseShortcut } from './shellLogic.js'

/**
 * ⌘K / Ctrl+K palette over data the dashboard already loaded. Items:
 * [{ id, group, label, sublabel?, icon?, avatar?, shortcut?, keywords?, searchOnly?, onSelect }].
 */
export default function CommandPalette({ open, onClose, items = [] }) {
  const theme = useTheme()
  const { t } = useI18n()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef(null)
  const listId = useId()

  const results = useMemo(() => filterCommandItems(items, query), [items, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  const run = (item) => {
    if (!item) {
      return
    }
    onClose()
    // Let the dialog start closing before the action opens other UI.
    window.setTimeout(() => item.onSelect?.(), 0)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        results.length ? (index - 1 + results.length) % results.length : 0
      )
    } else if (event.key === 'Enter') {
      event.preventDefault()
      run(results[activeIndex])
    }
  }

  let previousGroup = null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-label={t('shell.openCommandPalette')}
      sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
      PaperProps={{
        sx: {
          mt: { xs: 2, sm: '12vh' },
          mx: { xs: 1.5, sm: 4 },
          width: { xs: 'calc(100% - 24px)', sm: '100%' },
          maxWidth: 560,
          bgcolor: shell.popover,
          backgroundImage: 'none',
          border: `1px solid ${shell.lineStrong}`,
          borderRadius: '14px',
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${shell.line}`,
          color: tones.subtle,
        }}
      >
        <ShellIcon name="search" />
        <InputBase
          autoFocus
          fullWidth
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('shell.palette.placeholder')}
          inputProps={{
            role: 'combobox',
            'aria-expanded': true,
            'aria-controls': listId,
            'aria-activedescendant': results[activeIndex]
              ? `${listId}-${results[activeIndex].id}`
              : undefined,
            'aria-label': t('shell.palette.placeholder'),
          }}
          sx={{ fontSize: '0.95rem', color: 'text.primary' }}
        />
        <Kbd>Esc</Kbd>
      </Box>

      <Box
        ref={listRef}
        id={listId}
        role="listbox"
        sx={{ maxHeight: { xs: '60vh', sm: 420 }, overflowY: 'auto', py: 0.5 }}
      >
        {results.length === 0 ? (
          <Typography sx={{ px: 2, py: 3, color: tones.subtle, fontSize: '0.88rem' }}>
            {t('shell.palette.noResults', { query })}
          </Typography>
        ) : (
          results.map((item, index) => {
            const showGroup = item.group !== previousGroup
            previousGroup = item.group
            const active = index === activeIndex
            return (
              <Box key={`${item.group}-${item.id}`}>
                {showGroup ? (
                  <Typography
                    aria-hidden="true"
                    sx={{
                      px: 2,
                      pt: 1.25,
                      pb: 0.5,
                      fontSize: '0.69rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: tones.muted,
                    }}
                  >
                    {t(`shell.palette.groups.${item.group}`)}
                  </Typography>
                ) : null}
                <Box
                  id={`${listId}-${item.id}`}
                  role="option"
                  aria-selected={active}
                  data-index={index}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => run(item)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    color: active ? 'text.primary' : tones.subtle,
                    bgcolor: active ? tones.accentSoftBg : 'transparent',
                    boxShadow: active ? `inset 2px 0 0 ${shell.cta}` : 'none',
                  }}
                >
                  {item.avatar ? item.avatar : <ShellIcon name={item.icon || 'search'} size={16} />}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.label}
                    </Box>
                    {item.sublabel ? (
                      <Box
                        component="span"
                        sx={{ display: 'block', fontSize: '0.74rem', color: tones.muted }}
                      >
                        {item.sublabel}
                      </Box>
                    ) : null}
                  </Box>
                  {item.shortcut ? (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {parseShortcut(item.shortcut).map((key) => (
                        <Kbd key={key}>{key.toUpperCase()}</Kbd>
                      ))}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            )
          })
        )}
      </Box>
      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: `1px solid ${shell.line}`,
          fontSize: '0.72rem',
          color: tones.muted,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        {t('shell.palette.hint')}
      </Box>
    </Dialog>
  )
}
