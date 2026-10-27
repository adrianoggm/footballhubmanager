import { Box, IconButton, Tooltip } from '@mui/material'

/**
 * Icon-only dashboard header action. The translated `label` is both the tooltip
 * and the button's accessible name; the Material Symbols ligature text is
 * decorative and hidden from screen readers (otherwise they read "logout").
 * The tooltip wraps a <span> so it still works while the button is disabled.
 */
export default function HeaderIconButton({ icon, label, onClick, disabled = false, color }) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton aria-label={label} onClick={onClick} disabled={disabled} color={color}>
          <Box component="span" className="material-symbols-rounded" aria-hidden="true">
            {icon}
          </Box>
        </IconButton>
      </span>
    </Tooltip>
  )
}
