import { Box, Button, ButtonBase, LinearProgress, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useI18n } from '../../../i18n/useI18n.js'
import HeaderIconButton from '../../common/HeaderIconButton.jsx'
import SeasonChip from './SeasonChip.jsx'
import ShellIcon from './ShellIcon.jsx'
import { Crest, Kbd } from './shellParts.jsx'
import { commandModifierLabel } from './shellLogic.js'

const barSx = (shell) => ({
  position: 'sticky',
  top: 0,
  zIndex: (theme) => theme.zIndex.appBar,
  display: 'flex',
  alignItems: 'center',
  bgcolor: shell.topbar,
  backdropFilter: 'blur(10px)',
  borderBottom: `1px solid ${shell.line}`,
})

function LoadingLine({ loading }) {
  return loading ? (
    <LinearProgress
      color="secondary"
      sx={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2 }}
    />
  ) : null
}

/** Desktop topbar (56px): title + breadcrumb, ⌘K, refresh, season chip, primary action. */
export function DesktopTopbar({
  title,
  breadcrumb,
  onOpenPalette,
  onRefresh,
  refreshLabel,
  loading,
  onManageSeasons,
  primaryAction,
}) {
  const theme = useTheme()
  const { t } = useI18n()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}

  return (
    <Box component="header" sx={{ ...barSx(shell), height: 56, gap: 1.5, px: 3.5 }}>
      <Typography
        component="h1"
        sx={{
          fontFamily: theme.typography.h1?.fontFamily,
          fontWeight: 700,
          fontSize: '1.08rem',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Typography>
      {breadcrumb ? (
        <Typography
          sx={{
            color: tones.muted,
            fontSize: '0.82rem',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
          }}
        >
          {breadcrumb}
        </Typography>
      ) : null}
      <Box sx={{ flex: 1 }} />
      <ButtonBase
        onClick={onOpenPalette}
        aria-label={t('shell.openCommandPalette')}
        aria-keyshortcuts="Control+K Meta+K"
        sx={{
          width: { md: 180, lg: 230 },
          height: 32,
          justifyContent: 'flex-start',
          gap: 1,
          px: 1.25,
          borderRadius: '8px',
          border: `1px solid ${shell.line}`,
          bgcolor: shell.control,
          color: tones.muted,
          fontSize: '0.8rem',
          '&:hover': { borderColor: shell.lineStrong },
        }}
      >
        <ShellIcon name="search" size={15} />
        <Box component="span" sx={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
          {t('shell.searchPlaceholder')}
        </Box>
        <Kbd>{commandModifierLabel()}</Kbd>
        <Kbd>K</Kbd>
      </ButtonBase>
      <HeaderIconButton
        icon="refresh"
        label={refreshLabel}
        onClick={onRefresh}
        disabled={loading}
        color="inherit"
      />
      <SeasonChip onManageSeasons={onManageSeasons} />
      {primaryAction ? (
        <Button
          variant="contained"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          startIcon={<ShellIcon name={primaryAction.icon || 'plus'} size={15} />}
          sx={{ height: 32, minHeight: 32, whiteSpace: 'nowrap', flex: 'none' }}
        >
          {primaryAction.label}
        </Button>
      ) : null}
      <LoadingLine loading={loading} />
    </Box>
  )
}

/** Mobile topbar: crest (opens the peña/account sheet), title + context, season chip. */
export function MobileTopbar({ title, subtitle, pena, onOpenAccount, accountLabel, loading }) {
  const theme = useTheme()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}

  return (
    <Box
      component="header"
      sx={{
        ...barSx(shell),
        gap: 1.25,
        px: 2,
        py: 1.25,
        pt: 'calc(10px + env(safe-area-inset-top))',
      }}
    >
      <ButtonBase
        aria-label={accountLabel}
        onClick={onOpenAccount}
        sx={{ borderRadius: '9px', minWidth: 44, minHeight: 44, justifyContent: 'flex-start' }}
      >
        <Crest name={pena?.name} imageUrl={pena?.imageUrl} size={32} />
      </ButtonBase>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="h1"
          sx={{
            fontFamily: theme.typography.h1?.fontFamily,
            fontWeight: 700,
            fontSize: '0.98rem',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              fontSize: '0.74rem',
              color: tones.subtle,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <SeasonChip size="compact" />
      <LoadingLine loading={loading} />
    </Box>
  )
}
