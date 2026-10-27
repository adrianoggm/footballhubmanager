import { Box, ButtonBase, Tooltip, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useI18n } from '../../../i18n/useI18n.js'
import LogoHorizontal from '../../common/LogoHorizontal.jsx'
import PenaSwitcher from './PenaSwitcher.jsx'
import ShellIcon from './ShellIcon.jsx'

export const SIDEBAR_WIDTH = 240

/** One sidebar row: icon, label and the keyboard hint ("G R"). */
export function NavRow({
  icon,
  label,
  shortcut,
  active,
  disabled,
  disabledReason,
  onClick,
  ariaLabel,
}) {
  const theme = useTheme()
  const tones = theme.custom?.tones || {}
  const shell = theme.custom?.shell || {}

  const row = (
    <ButtonBase
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) {
          onClick?.()
        }
      }}
      sx={{
        width: '100%',
        justifyContent: 'flex-start',
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: '8px',
        fontSize: '0.84rem',
        fontWeight: 500,
        textAlign: 'left',
        color: active ? 'text.primary' : tones.subtle,
        bgcolor: active ? tones.accentSoftBg : 'transparent',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        '& .shell-nav-icon': { color: active ? shell.cta : 'inherit' },
        '&:hover': disabled
          ? {}
          : { bgcolor: active ? tones.accentSoftBg : shell.hover, color: 'text.primary' },
      }}
    >
      <Box component="span" className="shell-nav-icon" sx={{ display: 'flex' }}>
        <ShellIcon name={icon} size={17} />
      </Box>
      <Box component="span" sx={{ flex: 1, minWidth: 0 }}>
        {label}
      </Box>
      {shortcut ? (
        <Box
          component="span"
          aria-hidden="true"
          sx={{
            fontSize: '0.66rem',
            color: tones.muted,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            letterSpacing: '0.04em',
          }}
        >
          {shortcut}
        </Box>
      ) : null}
    </ButtonBase>
  )

  return disabled && disabledReason ? (
    <Tooltip title={disabledReason} placement="right">
      <span>{row}</span>
    </Tooltip>
  ) : (
    row
  )
}

function GroupLabel({ children }) {
  const theme = useTheme()
  return (
    <Typography
      sx={{
        px: 1.25,
        pt: 1.5,
        pb: 0.5,
        fontSize: '0.69rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: theme.custom?.tones?.muted,
      }}
    >
      {children}
    </Typography>
  )
}

/**
 * Desktop sidebar (>= md): brand, peña block/switcher, primary navigation,
 * an extra group (admin shortcuts / user peñas) and, at the bottom, settings
 * and logout.
 */
export default function ShellSidebar({
  penaSwitcher,
  navItems,
  activeNavId,
  onNavChange,
  extraGroup,
  account,
}) {
  const theme = useTheme()
  const { t } = useI18n()
  const shell = theme.custom?.shell || {}

  return (
    <Box
      component="aside"
      sx={{
        width: SIDEBAR_WIDTH,
        flex: 'none',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        px: 1.25,
        py: 1.75,
        bgcolor: shell.sidebar,
        borderRight: `1px solid ${shell.line}`,
      }}
    >
      <Box sx={{ px: 1, pt: 0.5, pb: 1.5, display: 'flex', alignItems: 'center' }}>
        <LogoHorizontal height={18} />
      </Box>

      <PenaSwitcher {...penaSwitcher} />

      <Box component="nav" aria-label={t('shell.navLabel')} sx={{ display: 'grid', gap: 0.25 }}>
        {navItems.map((item) => (
          <NavRow
            key={item.id}
            icon={item.icon}
            label={item.label}
            shortcut={item.shortcut}
            active={item.id === activeNavId}
            disabled={item.disabled}
            disabledReason={item.disabledReason}
            onClick={() => onNavChange(item.id)}
          />
        ))}
      </Box>

      {extraGroup?.items?.length ? (
        <Box sx={{ display: 'grid', gap: 0.25 }}>
          <GroupLabel>{extraGroup.title}</GroupLabel>
          {extraGroup.items.map((item) => (
            <NavRow
              key={item.id}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              active={item.id === activeNavId}
              onClick={item.onClick}
            />
          ))}
        </Box>
      ) : null}

      <Box
        sx={{
          mt: 'auto',
          pt: 1.25,
          borderTop: `1px solid ${shell.line}`,
          display: 'grid',
          gap: 0.25,
        }}
      >
        <NavRow
          icon="gear"
          label={t('shell.settings')}
          onClick={account.onOpenSettings}
          disabled={account.settingsDisabled}
        />
        <NavRow
          icon="logout"
          label={account.logoutLabel}
          onClick={account.onLogout}
          disabled={account.loading}
        />
      </Box>
    </Box>
  )
}
