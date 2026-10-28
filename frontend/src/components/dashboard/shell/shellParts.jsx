import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { initialsOf } from './shellLogic.js'

/** Keyboard key hint. */
export function Kbd({ children }) {
  const theme = useTheme()
  const shell = theme.custom?.shell || {}
  return (
    <Box
      component="kbd"
      sx={{
        font: '600 10.5px ui-monospace, SFMono-Regular, Menlo, monospace',
        border: `1px solid ${shell.lineStrong}`,
        borderBottomWidth: 2,
        borderRadius: '4px',
        px: '5px',
        py: '1px',
        lineHeight: 1.4,
        color: theme.custom?.tones?.subtle,
        bgcolor: shell.control,
      }}
    >
      {children}
    </Box>
  )
}

/** Peña crest: image when available, else initials on the raised surface. */
export function Crest({ name = '', imageUrl = '', size = 30 }) {
  const theme = useTheme()
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: `${Math.round(size * 0.27)}px`,
        overflow: 'hidden',
        display: 'grid',
        placeItems: 'center',
        fontFamily: theme.typography.h1?.fontFamily,
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
        bgcolor: theme.custom?.surfaces?.raised,
        color: theme.custom?.tones?.accentStrong,
      }}
    >
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initialsOf(name)
      )}
    </Box>
  )
}

/** Small status dot: green for the active season, neutral otherwise. */
export function StatusDot({ active }) {
  const theme = useTheme()
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        flex: 'none',
        display: 'inline-block',
        bgcolor: active ? theme.palette.success.main : theme.custom?.tones?.muted,
      }}
    />
  )
}
