// Centralized reader for the dashboard surface geometry tokens defined in
// theme.custom.dashboard. Previously duplicated in DashboardShell.jsx and
// AdminInsightsSection.jsx — keep the single copy here.

export const getSurfaceGeometry = (theme) => ({
  surfaceRadius: theme.custom?.dashboard?.radius?.surface || '14px',
  surfaceRadiusTight: theme.custom?.dashboard?.radius?.surfaceTight || '12px',
  controlRadius: theme.custom?.dashboard?.radius?.control || '10px',
  badgeRadius: theme.custom?.dashboard?.radius?.badge || '8px',
  subtleBorderAlpha:
    theme.custom?.dashboard?.borderOpacity?.subtle ?? (theme.palette.mode === 'dark' ? 0.12 : 0.08),
  strongBorderAlpha:
    theme.custom?.dashboard?.borderOpacity?.strong ?? (theme.palette.mode === 'dark' ? 0.16 : 0.12),
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
