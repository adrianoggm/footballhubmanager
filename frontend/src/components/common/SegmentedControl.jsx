import { Box, ButtonBase } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useRef } from 'react'

/**
 * Compact single-choice segmented control (radio group semantics, arrow keys
 * move the selection). Props: value, onChange(value), options [{ value, label }],
 * ariaLabel, fullWidth?
 */
export default function SegmentedControl({ value, onChange, options = [], ariaLabel, fullWidth }) {
  const theme = useTheme()
  const shell = theme.custom?.shell || {}
  const refs = useRef([])

  const selectAt = (index) => {
    const next = options[(index + options.length) % options.length]
    if (!next) {
      return
    }
    onChange(next.value)
    refs.current[(index + options.length) % options.length]?.focus()
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      selectAt(index + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      selectAt(index - 1)
    }
  }

  return (
    <Box
      role="radiogroup"
      aria-label={ariaLabel}
      sx={{
        display: fullWidth ? 'flex' : 'inline-flex',
        maxWidth: '100%',
        overflowX: 'auto',
        p: '2px',
        borderRadius: '8px',
        border: `1px solid ${shell.lineStrong || theme.palette.divider}`,
        bgcolor: shell.control || 'background.paper',
      }}
    >
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <ButtonBase
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            sx={{
              flex: fullWidth ? 1 : 'none',
              px: 1.25,
              py: 0.5,
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              color: selected
                ? theme.custom?.tones?.onRaised || 'text.primary'
                : theme.custom?.tones?.subtle || 'text.secondary',
              bgcolor: selected ? theme.custom?.surfaces?.raised : 'transparent',
            }}
          >
            {option.label}
          </ButtonBase>
        )
      })}
    </Box>
  )
}
