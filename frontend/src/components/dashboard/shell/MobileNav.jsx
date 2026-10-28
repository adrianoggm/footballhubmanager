import { Box, ButtonBase, Drawer, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useI18n } from '../../../i18n/useI18n.js'
import ShellIcon from './ShellIcon.jsx'

export const BOTTOM_NAV_HEIGHT = 64

/**
 * Fixed bottom navigation (< md) with 5 destinations. Items:
 * [{ id, label, icon, variant?: 'fab', onClick, active }]. Respects the
 * bottom safe-area inset.
 */
export function BottomNav({ items = [], label }) {
  const theme = useTheme()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}

  return (
    <Box
      component="nav"
      aria-label={label}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        display: 'flex',
        alignItems: 'stretch',
        height: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`,
        pb: 'env(safe-area-inset-bottom)',
        px: 0.75,
        bgcolor: shell.sidebar,
        borderTop: `1px solid ${shell.line}`,
      }}
    >
      {items.map((item) => {
        const fab = item.variant === 'fab'
        return (
          <ButtonBase
            key={item.id}
            aria-current={item.active ? 'page' : undefined}
            aria-haspopup={item.popup ? 'dialog' : undefined}
            onClick={item.onClick}
            sx={{
              flex: 1,
              minWidth: 0,
              flexDirection: 'column',
              gap: 0.4,
              pt: 0.75,
              borderRadius: '10px',
              fontSize: '0.66rem',
              fontWeight: 600,
              color: item.active ? 'text.primary' : tones.muted,
              '& .bottom-nav-icon': { color: item.active ? shell.cta : 'inherit' },
            }}
          >
            {fab ? (
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  mt: -0.75,
                  borderRadius: '12px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: shell.cta,
                  color: shell.onCta,
                  boxShadow: theme.custom?.shadows?.md,
                }}
              >
                <ShellIcon name={item.icon} size={22} />
              </Box>
            ) : (
              <Box component="span" className="bottom-nav-icon" sx={{ display: 'flex' }}>
                <ShellIcon name={item.icon} size={22} />
              </Box>
            )}
            <Box
              component="span"
              sx={{
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.label}
            </Box>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

/** One action row inside a bottom sheet. */
export function SheetRow({ icon, label, onClick, active, tone, disabled }) {
  const theme = useTheme()
  const tones = theme.custom?.tones || {}
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? 'page' : undefined}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1.5,
        px: 1.5,
        minHeight: 48,
        borderRadius: '10px',
        fontSize: '0.92rem',
        fontWeight: 500,
        textAlign: 'left',
        opacity: disabled ? 0.5 : 1,
        color: tone === 'danger' ? 'error.main' : active ? 'text.primary' : tones.subtle,
        bgcolor: active ? tones.accentSoftBg : 'transparent',
      }}
    >
      <ShellIcon name={icon} size={20} />
      {label}
    </ButtonBase>
  )
}

/** Bottom sheet (MUI Drawer) with a title and arbitrary rows. */
export function BottomSheet({ open, onClose, title, children }) {
  const theme = useTheme()
  const { t } = useI18n()
  const shell = theme.custom?.shell || {}

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        'aria-label': title,
        sx: {
          bgcolor: shell.popover,
          backgroundImage: 'none',
          borderTop: `1px solid ${shell.lineStrong}`,
          borderRadius: '16px 16px 0 0',
          px: 1.5,
          pt: 1,
          pb: 'calc(12px + env(safe-area-inset-bottom))',
          maxHeight: '85vh',
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: shell.lineStrong, mx: 'auto', mb: 1 }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pb: 0.5 }}>
        <Typography sx={{ flex: 1, fontWeight: 700, fontFamily: theme.typography.h1?.fontFamily }}>
          {title}
        </Typography>
        <ButtonBase
          aria-label={t('shell.closeSheet')}
          onClick={onClose}
          sx={{ width: 40, height: 40, borderRadius: '10px', color: theme.custom?.tones?.subtle }}
        >
          <ShellIcon name="close" size={18} />
        </ButtonBase>
      </Box>
      <Box sx={{ display: 'grid', gap: 0.25 }}>{children}</Box>
    </Drawer>
  )
}
