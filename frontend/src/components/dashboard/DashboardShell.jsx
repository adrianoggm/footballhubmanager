import { Box, ButtonBase, Grid, Paper, Stack, SvgIcon, Tooltip, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

const toneMap = {
  primary: 'primary.main',
  secondary: 'secondary.main',
  success: 'success.main',
  warning: 'warning.main',
  info: 'info.main',
  error: 'error.main',
}

const getDashboardGeometry = (theme) => ({
  surfaceRadius: theme.custom?.dashboard?.radius?.surface || '14px',
  surfaceRadiusTight: theme.custom?.dashboard?.radius?.surfaceTight || '12px',
  controlRadius: theme.custom?.dashboard?.radius?.control || '10px',
  badgeRadius: theme.custom?.dashboard?.radius?.badge || '8px',
  subtleBorderAlpha:
    theme.custom?.dashboard?.borderOpacity?.subtle ?? (theme.palette.mode === 'dark' ? 0.12 : 0.08),
  cardShadow:
    theme.custom?.dashboard?.shadows?.card ||
    (theme.palette.mode === 'dark'
      ? '0 14px 28px rgba(0, 0, 0, 0.22)'
      : '0 10px 22px rgba(15, 23, 42, 0.05)'),
  panelShadow:
    theme.custom?.dashboard?.shadows?.panel ||
    (theme.palette.mode === 'dark'
      ? '0 14px 30px rgba(0, 0, 0, 0.3)'
      : '0 14px 30px rgba(15, 23, 42, 0.08)'),
})

const getInitials = (value = '') =>
  String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('') || 'FH'

function BrandGlyph(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path d="M6 4h12a2 2 0 0 1 2 2v12H8a2 2 0 0 1-2-2V4Z" fill="currentColor" opacity="0.2" />
      <path
        d="M8 4h10a2 2 0 0 1 2 2v10M7 8h10M7 12h6M7 16h8M4 6h2v12a2 2 0 0 0 2 2h10v2H8a4 4 0 0 1-4-4V6Z"
        fill="currentColor"
      />
    </SvgIcon>
  )
}

function NavigationIcon({ kind, active = false }) {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24">
      {kind === 'overview' && (
        <path
          d="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h5v7H4v-7Zm7 0h9v7h-9v-7Z"
          fill="currentColor"
          opacity={active ? 1 : 0.88}
        />
      )}
      {kind === 'seasons' && (
        <>
          <path d="M6 3h2v3H6V3Zm10 0h2v3h-2V3Z" fill="currentColor" />
          <path
            d="M5 6h14a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2Zm0 5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7H5Z"
            fill="currentColor"
            opacity={active ? 1 : 0.9}
          />
        </>
      )}
      {kind === 'accountability' && (
        <path
          d="M6 5h12a2 2 0 0 1 2 2v2H4V7a2 2 0 0 1 2-2Zm-2 6h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Zm3 2v2h4v-2H7Zm9 0h-3v2h3v-2Z"
          fill="currentColor"
          opacity={active ? 1 : 0.9}
        />
      )}
      {kind === 'players' && (
        <>
          <path
            d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
            fill="currentColor"
          />
          <path
            d="M4 18a4.5 4.5 0 0 1 9 0v1H4v-1Zm10 1a3.5 3.5 0 0 1 7 0h-7Z"
            fill="currentColor"
            opacity={active ? 1 : 0.88}
          />
        </>
      )}
      {kind === 'matches' && (
        <>
          <path
            d="M12 3 4 7v5c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V7l-8-4Z"
            fill="currentColor"
            opacity={active ? 1 : 0.2}
          />
          <path
            d="M12 5.4 6 8.3v3.5c0 3.8 2.4 6.9 6 8.1 3.6-1.2 6-4.3 6-8.1V8.3l-6-2.9Zm-1.8 4.1h3.6l1.1 3.2-2.9 2.1-2.9-2.1 1.1-3.2Z"
            fill="currentColor"
          />
        </>
      )}
      {kind === 'standings' && (
        <path
          d="M5 19h14v2H3V5h2v14Zm3-3V9h3v7H8Zm5 0V5h3v11h-3Zm5 0v-4h3v4h-3Z"
          fill="currentColor"
          opacity={active ? 1 : 0.92}
        />
      )}
      {kind === 'join' && (
        <path
          d="M8.6 15.4a3.5 3.5 0 0 1 0-5l2.3-2.3 1.4 1.4-2.3 2.3a1.5 1.5 0 1 0 2.1 2.1l2.3-2.3 1.4 1.4-2.3 2.3a3.5 3.5 0 0 1-5 0Zm6.8-6.8a3.5 3.5 0 0 1 0 5l-2.3 2.3-1.4-1.4 2.3-2.3a1.5 1.5 0 1 0-2.1-2.1l-2.3 2.3-1.4-1.4 2.3-2.3a3.5 3.5 0 0 1 5 0Z"
          fill="currentColor"
        />
      )}
      {kind === 'membership' && (
        <path
          d="M12 4.5 5 8v8l7 3.5 7-3.5V8l-7-3.5Zm0 2.2 4.3 2.1L12 11 7.7 8.8 12 6.7Zm-5 3.7 4 2v4.6l-4-2V10.4Zm6 6.6v-4.6l4-2v4.6l-4 2Z"
          fill="currentColor"
        />
      )}
      {kind === 'insights' && (
        <>
          <path d="M5 19h14v2H3V5h2v14Z" fill="currentColor" opacity={0.32} />
          <path
            d="m7 15 3.2-3.2 2.4 1.9L17 8l1.5 1.2-5.3 6.7-2.5-2-2.3 2.3L7 15Z"
            fill="currentColor"
          />
        </>
      )}
      {![
        'overview',
        'seasons',
        'accountability',
        'players',
        'matches',
        'standings',
        'join',
        'membership',
        'insights',
      ].includes(kind) && (
        <path d="M5 5h14v14H5V5Zm3 3v8h2V8H8Zm4 0v5h4V8h-4Zm0 7v1h4v-1h-4Z" fill="currentColor" />
      )}
    </SvgIcon>
  )
}

function DashboardStatGlyph({ tone }) {
  return (
    <SvgIcon fontSize="small" viewBox="0 0 24 24">
      {tone === 'secondary' && (
        <>
          <path d="M5 6h6v5H5V6Zm8 0h6v3h-6V6Z" fill="currentColor" opacity="0.9" />
          <path d="M5 13h4v5H5v-5Zm6 0h8v5h-8v-5Z" fill="currentColor" opacity="0.55" />
        </>
      )}
      {tone === 'success' && (
        <>
          <path d="M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" fill="currentColor" opacity="0.16" />
          <path d="m10.8 14.9-2.4-2.4 1.4-1.4 1 1 3.3-3.3 1.4 1.4-4.7 4.7Z" fill="currentColor" />
        </>
      )}
      {tone === 'warning' && (
        <>
          <path
            d="M12 4.5A7.5 7.5 0 1 1 4.5 12 7.5 7.5 0 0 1 12 4.5Z"
            fill="currentColor"
            opacity="0.14"
          />
          <path
            d="M11 8h2v5h-2V8Zm1 8a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 12 16Z"
            fill="currentColor"
          />
        </>
      )}
      {tone === 'info' && (
        <>
          <path
            d="M6 6h12v3H6V6Zm0 5h8v3H6v-3Zm0 5h12v3H6v-3Z"
            fill="currentColor"
            opacity="0.92"
          />
        </>
      )}
      {tone === 'error' && (
        <>
          <path d="M12 4 4 20h16L12 4Z" fill="currentColor" opacity="0.16" />
          <path d="M11 10h2v4h-2v-4Zm0 5h2v2h-2v-2Z" fill="currentColor" />
        </>
      )}
      {!['secondary', 'success', 'warning', 'info', 'error'].includes(tone) && (
        <>
          <path
            d="M5 6h14v4H5V6Zm0 6h9v2H5v-2Zm0 4h14v2H5v-2Z"
            fill="currentColor"
            opacity="0.88"
          />
        </>
      )}
    </SvgIcon>
  )
}

function DashboardStatCard({ item }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)
  const tone = toneMap[item.tone] || toneMap.primary
  const accent = tone.includes('.') ? theme.palette[tone.split('.')[0]][tone.split('.')[1]] : tone
  const valueText = String(item.value ?? '').trim() || '-'
  const usesWideValue = valueText.length > 18
  const usesMediumValue = valueText.length > 10
  const usesNumericValue = /^[\d#\-+/.,\s]+$/.test(valueText)
  const helperText = String(item.helper ?? '').trim()
  const helperMeta = item.helperLabel ? `${item.helperLabel} · ${helperText}` : helperText

  return (
    <Paper
      elevation={0}
      sx={{
        minHeight: '100%',
        borderRadius: geometry.surfaceRadius,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isDark ? 0.98 : 0.98)} 0%, ${alpha(
          theme.palette.background.default,
          isDark ? 0.72 : 0.7
        )} 100%)`,
        boxShadow: geometry.cardShadow,
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(145deg, ${alpha(accent, 0.06)} 0%, transparent 42%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: 88,
          px: { xs: 1.15, xl: 1.05 },
          py: 1.05,
        }}
      >
        <Stack spacing={0.65} sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 0.5, lineHeight: 1.05, maxWidth: '76%' }}
            >
              {item.label}
            </Typography>

            <Box
              sx={{
                width: 22,
                height: 22,
                flexShrink: 0,
                borderRadius: geometry.badgeRadius,
                display: 'grid',
                placeItems: 'center',
                color: accent,
                bgcolor: alpha(accent, 0.1),
                border: `1px solid ${alpha(accent, 0.14)}`,
              }}
            >
              <DashboardStatGlyph tone={item.tone} />
            </Box>
          </Stack>

          <Typography
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.08,
              letterSpacing: usesNumericValue ? -0.28 : -0.1,
              fontSize: usesWideValue
                ? '0.94rem'
                : usesMediumValue
                  ? '1.02rem'
                  : usesNumericValue
                    ? '1.34rem'
                    : '1.08rem',
              overflowWrap: 'anywhere',
            }}
          >
            {valueText}
          </Typography>

          {helperMeta ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: '0.76rem',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '2.5em',
              }}
            >
              {helperMeta}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Paper>
  )
}

export function DashboardControlField({ label, helper = '', children }) {
  return (
    <Stack spacing={0.5}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 800, letterSpacing: 0.3, pl: 0.25 }}
      >
        {label}
      </Typography>
      {children}
      {helper ? (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.25 }}>
          {helper}
        </Typography>
      ) : null}
    </Stack>
  )
}

export function DashboardIdentitySlot({ imageUrl = '', imageAlt = '', name = '', subtitle = '' }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)
  const initials = getInitials(name)

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          borderRadius: geometry.controlRadius,
          border: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.16 : 0.12)}`,
          background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, isDark ? 0.18 : 0.1)} 0%, ${alpha(
            theme.palette.secondary.main,
            isDark ? 0.22 : 0.14
          )} 100%)`,
        }}
      >
        {imageUrl ? (
          <Box
            component="img"
            src={imageUrl}
            alt={imageAlt || name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {initials}
          </Typography>
        )}
      </Box>

      <Stack spacing={0} sx={{ minWidth: 0 }}>
        {name ? (
          <Typography
            variant="subtitle1"
            title={name}
            sx={{
              fontWeight: 700,
              fontSize: '1rem',
              lineHeight: 1.2,
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </Typography>
        ) : null}
        {subtitle ? (
          <Typography
            variant="body2"
            color="text.secondary"
            title={subtitle}
            sx={{
              fontSize: '0.8rem',
              lineHeight: 1.2,
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  )
}

function DesktopNav({ brand, brandShort, navItems, activeNavId, onNavChange, railLabel }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)

  return (
    <Paper
      component="aside"
      elevation={0}
      sx={{
        display: { xs: 'none', xl: 'flex' },
        width: 72,
        minWidth: 72,
        p: 0.9,
        borderRadius: geometry.surfaceRadius,
        position: 'sticky',
        top: 18,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 36px)',
        overflowY: 'auto',
        border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isDark ? 0.96 : 0.92)} 0%, ${alpha(
          theme.palette.background.default,
          isDark ? 0.7 : 0.72
        )} 100%)`,
        boxShadow: isDark ? '0 24px 56px rgba(0, 0, 0, 0.3)' : '0 24px 56px rgba(15, 23, 42, 0.12)',
      }}
    >
      <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
        <Tooltip title={railLabel || brand} placement="right">
          <Stack
            spacing={0.5}
            alignItems="center"
            sx={{
              width: '100%',
              pb: 0.9,
              borderBottom: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: geometry.controlRadius,
                display: 'grid',
                placeItems: 'center',
                color: 'common.white',
                background: 'linear-gradient(160deg, rgba(21,33,55,1) 0%, rgba(22,84,84,1) 85%)',
                boxShadow: '0 12px 24px rgba(15, 23, 42, 0.2)',
              }}
            >
              <BrandGlyph sx={{ fontSize: 18 }} />
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.7 }}>
              {brandShort}
            </Typography>
          </Stack>
        </Tooltip>

        <Stack spacing={0.55} sx={{ width: '100%' }}>
          {navItems.map((item) => {
            const active = item.id === activeNavId
            return (
              <Tooltip
                key={item.id}
                title={item.disabled ? item.disabledReason || item.label : item.label}
                placement="right"
              >
                <ButtonBase
                  aria-label={item.label}
                  aria-disabled={item.disabled || undefined}
                  onClick={() => {
                    if (!item.disabled) {
                      onNavChange(item.id)
                    }
                  }}
                  sx={{
                    width: '100%',
                    minHeight: 42,
                    borderRadius: geometry.controlRadius,
                    position: 'relative',
                    color: active ? 'secondary.main' : 'text.secondary',
                    border: `1px solid ${
                      active
                        ? alpha(theme.palette.secondary.main, 0.22)
                        : alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)
                    }`,
                    background: active
                      ? `linear-gradient(135deg, ${alpha(
                          theme.palette.secondary.light,
                          isDark ? 0.16 : 0.22
                        )} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`
                      : alpha(theme.palette.background.paper, isDark ? 0.72 : 0.62),
                    boxShadow: active
                      ? isDark
                        ? '0 10px 22px rgba(0, 0, 0, 0.24)'
                        : '0 10px 22px rgba(15, 23, 42, 0.1)'
                      : 'none',
                    transition:
                      'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                    opacity: item.disabled ? 0.4 : 1,
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    '&:hover': item.disabled
                      ? {}
                      : {
                          transform: 'translateY(-1px)',
                          boxShadow: isDark
                            ? '0 10px 22px rgba(0, 0, 0, 0.2)'
                            : '0 10px 22px rgba(15, 23, 42, 0.08)',
                        },
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 6,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: 999,
                      bgcolor: active ? 'secondary.main' : 'transparent',
                    }}
                  />
                  <NavigationIcon kind={item.icon || item.id} active={active} />
                </ButtonBase>
              </Tooltip>
            )
          })}
        </Stack>
      </Stack>
    </Paper>
  )
}

function MobileNav({ navItems, activeNavId, onNavChange }) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: 'block', xl: 'none' },
        p: 0.9,
        borderRadius: geometry.surfaceRadius,
        border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
        background: alpha(theme.palette.background.paper, isDark ? 0.82 : 0.8),
        backdropFilter: 'blur(14px)',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          overflowX: 'auto',
          pb: 0.25,
          '&::-webkit-scrollbar': {
            display: 'none',
          },
        }}
      >
        {navItems.map((item) => {
          const active = item.id === activeNavId
          return (
            <ButtonBase
              key={item.id}
              aria-disabled={item.disabled || undefined}
              onClick={() => {
                if (!item.disabled) {
                  onNavChange(item.id)
                }
              }}
              sx={{
                minWidth: 104,
                borderRadius: geometry.controlRadius,
                px: 1.25,
                py: 0.95,
                justifyContent: 'flex-start',
                opacity: item.disabled ? 0.4 : 1,
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                border: `1px solid ${
                  active
                    ? alpha(theme.palette.secondary.main, 0.22)
                    : alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)
                }`,
                background: active
                  ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.2)} 0%, ${alpha(
                      theme.palette.background.paper,
                      0.98
                    )} 100%)`
                  : alpha(theme.palette.background.paper, isDark ? 0.72 : 0.62),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <NavigationIcon kind={item.icon || item.id} active={active} />
                <Typography variant="body2" sx={{ fontWeight: active ? 700 : 600 }}>
                  {item.label}
                </Typography>
              </Stack>
            </ButtonBase>
          )
        })}
      </Stack>
    </Paper>
  )
}

export default function DashboardShell({
  brand = '',
  brandShort = 'FH',
  railLabel = '',
  navItems = [],
  activeNavId = '',
  onNavChange = () => {},
  title = '',
  subtitle = '',
  badges = null,
  headerAside = null,
  summaryCards = [],
  children,
}) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const geometry = getDashboardGeometry(theme)

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        gap: { xs: 1.1, lg: 1.3, xl: 1.5 },
        alignItems: 'flex-start',
      }}
    >
      <DesktopNav
        brand={brand}
        brandShort={brandShort}
        navItems={navItems}
        activeNavId={activeNavId}
        onNavChange={onNavChange}
        railLabel={railLabel}
      />

      <Stack flex={1} spacing={1.5} sx={{ minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: geometry.surfaceRadius,
            border: `1px solid ${alpha(theme.palette.text.primary, geometry.subtleBorderAlpha)}`,
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, isDark ? 0.98 : 0.98)} 0%, ${alpha(
              theme.palette.background.default,
              isDark ? 0.82 : 0.72
            )} 100%)`,
            boxShadow: geometry.panelShadow,
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, ${alpha(theme.palette.secondary.main, isDark ? 0.09 : 0.05)} 0%, ${alpha(
                theme.palette.secondary.main,
                0
              )} 44%)`,
              pointerEvents: 'none',
            },
          }}
        >
          <Grid container alignItems="stretch">
            <Grid item xs={12} xl={headerAside ? 7 : 12}>
              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  height: '100%',
                  p: { xs: 1.15, md: 1.3, xl: 1.25 },
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: { xs: 120, xl: 116 },
                }}
              >
                <Stack spacing={0.6} sx={{ maxWidth: 680, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.55} alignItems="center" flexWrap="wrap">
                    <Typography
                      variant="overline"
                      sx={{
                        color: 'secondary.dark',
                        fontWeight: 800,
                        letterSpacing: 0.75,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {brand}
                    </Typography>
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        boxShadow: `0 0 0 3px ${alpha(theme.palette.success.main, 0.12)}`,
                      }}
                    />
                  </Stack>

                  <Typography
                    variant="h3"
                    sx={{
                      maxWidth: { xs: '100%', lg: '22ch' },
                      fontSize: { xs: '1.24rem', sm: '1.36rem', lg: '1.5rem' },
                      lineHeight: 1,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {title}
                  </Typography>

                  {subtitle ? (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        maxWidth: { xs: '100%', lg: '68ch' },
                        fontSize: { xs: '0.76rem', md: '0.82rem' },
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {subtitle}
                    </Typography>
                  ) : null}

                  {badges ? (
                    <Stack direction="row" gap={0.4} flexWrap="wrap" sx={{ pt: 0.1 }}>
                      {badges}
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Grid>

            {headerAside ? (
              <Grid item xs={12} xl={5}>
                <Box
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    height: '100%',
                    p: { xs: 1.1, md: 1.25, xl: 1.2 },
                    borderTop: {
                      xs: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
                      xl: 0,
                    },
                    borderLeft: {
                      xl: `1px solid ${alpha(theme.palette.text.primary, isDark ? 0.12 : 0.08)}`,
                    },
                    background: { xl: alpha(theme.palette.background.paper, isDark ? 0.34 : 0.36) },
                  }}
                >
                  {headerAside}
                </Box>
              </Grid>
            ) : null}
          </Grid>
        </Paper>

        {navItems.length > 0 ? (
          <MobileNav navItems={navItems} activeNavId={activeNavId} onNavChange={onNavChange} />
        ) : null}

        {summaryCards.length > 0 ? (
          <Grid container spacing={0.9}>
            {summaryCards.map((item) => (
              <Grid key={item.label} item xs={12} sm={6} lg={6} xl={3}>
                <DashboardStatCard item={item} />
              </Grid>
            ))}
          </Grid>
        ) : null}

        <Stack spacing={1.5}>{children}</Stack>
      </Stack>
    </Box>
  )
}
