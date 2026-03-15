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

function DashboardStatCard({ item }) {
  const theme = useTheme()
  const tone = toneMap[item.tone] || toneMap.primary
  const accent = tone.includes('.') ? theme.palette[tone.split('.')[0]][tone.split('.')[1]] : tone

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        minHeight: '100%',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.primary.dark, 0.08)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.92)} 0%, ${alpha(
          theme.palette.background.paper,
          0.92
        )} 100%)`,
        boxShadow: '0 18px 38px rgba(15, 23, 42, 0.08)',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${alpha(accent, 0.14)} 0%, transparent 62%)`,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack spacing={1.1} sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            width: 42,
            height: 4,
            borderRadius: 999,
            bgcolor: alpha(accent, 0.82),
          }}
        />
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1.3 }}>
          {item.label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.05 }}>
          {item.value}
        </Typography>
        {item.helper ? (
          <Typography variant="body2" color="text.secondary">
            {item.helper}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  )
}

function DesktopNav({ brand, brandShort, navItems, activeNavId, onNavChange, railLabel }) {
  const theme = useTheme()

  return (
    <Paper
      component="aside"
      elevation={0}
      sx={{
        display: { xs: 'none', lg: 'flex' },
        width: { lg: 90, xl: 104 },
        minWidth: { lg: 90, xl: 104 },
        p: 1.5,
        borderRadius: 5,
        position: 'sticky',
        top: 24,
        alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        border: `1px solid ${alpha(theme.palette.primary.dark, 0.08)}`,
        background: `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.9)} 0%, ${alpha(
          theme.palette.background.paper,
          0.9
        )} 100%)`,
        boxShadow: '0 24px 56px rgba(15, 23, 42, 0.12)',
      }}
    >
      <Stack justifyContent="space-between" sx={{ minHeight: '100%' }}>
        <Stack spacing={2}>
          <Stack spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3.5,
                display: 'grid',
                placeItems: 'center',
                color: 'common.white',
                background: 'linear-gradient(160deg, rgba(21,33,55,1) 0%, rgba(22,84,84,1) 85%)',
                boxShadow: '0 18px 36px rgba(15, 23, 42, 0.22)',
              }}
            >
              <BrandGlyph sx={{ fontSize: 26 }} />
            </Box>
            <Stack spacing={0.25} alignItems="center">
              <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 1.1 }}>
                {brandShort}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center', lineHeight: 1.2 }}
              >
                {brand}
              </Typography>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            {navItems.map((item) => {
              const active = item.id === activeNavId
              return (
                <Tooltip key={item.id} title={item.label} placement="right">
                  <ButtonBase
                    onClick={() => onNavChange(item.id)}
                    sx={{
                      width: '100%',
                      borderRadius: 3,
                      px: 1,
                      py: 1.1,
                      color: active ? 'primary.dark' : 'text.secondary',
                      border: `1px solid ${
                        active
                          ? alpha(theme.palette.secondary.main, 0.22)
                          : alpha(theme.palette.primary.dark, 0.08)
                      }`,
                      background: active
                        ? `linear-gradient(135deg, ${alpha(
                            theme.palette.secondary.light,
                            0.22
                          )} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`
                        : alpha(theme.palette.common.white, 0.58),
                      boxShadow: active ? '0 14px 28px rgba(15, 23, 42, 0.12)' : 'none',
                      transition:
                        'transform 160ms ease, box-shadow 160ms ease, background 160ms ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 14px 28px rgba(15, 23, 42, 0.10)',
                      },
                    }}
                  >
                    <Stack spacing={0.5} alignItems="center">
                      <NavigationIcon kind={item.icon || item.id} active={active} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: active ? 700 : 600,
                          textAlign: 'center',
                          lineHeight: 1.15,
                        }}
                      >
                        {item.shortLabel || item.label}
                      </Typography>
                    </Stack>
                  </ButtonBase>
                </Tooltip>
              )
            })}
          </Stack>
        </Stack>

        {railLabel ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center', lineHeight: 1.35 }}
          >
            {railLabel}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  )
}

function MobileNav({ navItems, activeNavId, onNavChange }) {
  const theme = useTheme()

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: 'block', lg: 'none' },
        p: 1,
        borderRadius: 4,
        border: `1px solid ${alpha(theme.palette.primary.dark, 0.08)}`,
        background: alpha(theme.palette.common.white, 0.8),
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
              onClick={() => onNavChange(item.id)}
              sx={{
                minWidth: 116,
                borderRadius: 3,
                px: 1.5,
                py: 1.15,
                justifyContent: 'flex-start',
                border: `1px solid ${
                  active
                    ? alpha(theme.palette.secondary.main, 0.22)
                    : alpha(theme.palette.primary.dark, 0.08)
                }`,
                background: active
                  ? `linear-gradient(135deg, ${alpha(theme.palette.secondary.light, 0.2)} 0%, ${alpha(
                      theme.palette.background.paper,
                      0.98
                    )} 100%)`
                  : alpha(theme.palette.common.white, 0.62),
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

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        gap: { xs: 2, lg: 2.5, xl: 3 },
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

      <Stack flex={1} spacing={3} sx={{ minWidth: 0 }}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: { xs: 4, md: 5 },
            border: `1px solid ${alpha(theme.palette.primary.dark, 0.08)}`,
            background:
              'linear-gradient(142deg, rgba(255,255,255,0.9) 0%, rgba(231,244,240,0.85) 52%, rgba(255,241,225,0.88) 100%)',
            boxShadow: '0 28px 60px rgba(15, 23, 42, 0.14)',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at top right, rgba(15,118,110,0.18) 0%, rgba(15,118,110,0) 36%), radial-gradient(circle at bottom left, rgba(180,83,9,0.16) 0%, rgba(180,83,9,0) 34%)',
              pointerEvents: 'none',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: 0,
              opacity: 0.08,
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.45) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage:
                'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 76%, transparent 100%)',
              pointerEvents: 'none',
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2.25, md: 3.25 } }}>
            <Stack spacing={3}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={2.5}
                justifyContent="space-between"
                alignItems={{ lg: 'flex-start' }}
              >
                <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Typography
                      variant="overline"
                      sx={{ color: 'secondary.dark', fontWeight: 800, letterSpacing: 1.4 }}
                    >
                      {brand}
                    </Typography>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        boxShadow: `0 0 0 6px ${alpha(theme.palette.success.main, 0.14)}`,
                      }}
                    />
                  </Stack>

                  <Typography variant="h3">{title}</Typography>

                  {subtitle ? (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.98rem', md: '1.04rem' } }}
                    >
                      {subtitle}
                    </Typography>
                  ) : null}

                  {badges ? (
                    <Stack direction="row" gap={1} flexWrap="wrap">
                      {badges}
                    </Stack>
                  ) : null}
                </Stack>

                {headerAside ? (
                  <Box sx={{ width: { xs: '100%', lg: 320, xl: 360 }, flexShrink: 0 }}>
                    {headerAside}
                  </Box>
                ) : null}
              </Stack>
            </Stack>
          </Box>
        </Paper>

        {navItems.length > 0 ? (
          <MobileNav navItems={navItems} activeNavId={activeNavId} onNavChange={onNavChange} />
        ) : null}

        {summaryCards.length > 0 ? (
          <Grid container spacing={2}>
            {summaryCards.map((item) => (
              <Grid key={item.label} item xs={12} sm={6} lg={6} xl={3}>
                <DashboardStatCard item={item} />
              </Grid>
            ))}
          </Grid>
        ) : null}

        <Stack spacing={3}>{children}</Stack>
      </Stack>
    </Box>
  )
}
