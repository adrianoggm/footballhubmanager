import { Box, Stack, Typography, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/useI18n.js'
import CommandPalette from './shell/CommandPalette.jsx'
import { BOTTOM_NAV_HEIGHT, BottomNav, BottomSheet, SheetRow } from './shell/MobileNav.jsx'
import { PenaList } from './shell/PenaSwitcher.jsx'
import { ReadOnlySeasonStrip } from './shell/SeasonChip.jsx'
import ShellSidebar from './shell/ShellSidebar.jsx'
import { DesktopTopbar, MobileTopbar } from './shell/ShellTopbar.jsx'
import { useShellShortcuts } from './shell/useShellShortcuts.js'

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

const SHEETS = Object.freeze({ none: '', account: 'account', create: 'create', more: 'more' })

/**
 * Dashboard shell shared by the admin and player dashboards (redesign F1).
 *
 * Desktop (>= md): 240px sidebar (peña switcher, navigation with "G + letter"
 * shortcuts, an extra group, settings/logout) + 56px topbar (title, ⌘K,
 * refresh, season chip, primary action). Mobile: compact topbar + fixed
 * bottom navigation with sheets for "New", "More" and the peña/account menu.
 *
 * Props:
 *  - navItems [{ id, label, icon, shortcut?, disabled?, disabledReason? }], activeNavId, onNavChange(id)
 *  - extraGroup { title, items [{ id, label, icon, shortcut?, onClick }] }
 *  - createActions [{ id, label, icon, shortcut?, onClick }] (palette + mobile "New" sheet)
 *  - mobileNav [{ id, label, icon, kind: 'nav' | 'create' | 'more', target? }], moreNavIds [id]
 *  - title, breadcrumb, mobileSubtitle, primaryAction { label, icon?, onClick, disabled? }
 *  - penaSwitcher { pena, penas, selectedPenaGuid, onSelectPena, switchable, footerActions }
 *  - commandItems: extra palette items (matches, players, actions)
 *  - account { onOpenSettings, settingsDisabled, onRefresh, refreshLabel, onLogout, logoutLabel, loading }
 *  - onManageSeasons?, notice (node under the topbar), children (section content)
 */
export default function DashboardShell({
  navItems = [],
  activeNavId = '',
  onNavChange = () => {},
  extraGroup = null,
  createActions = [],
  mobileNav = [],
  moreNavIds = [],
  title = '',
  breadcrumb = '',
  mobileSubtitle = '',
  primaryAction = null,
  penaSwitcher = {},
  commandItems = [],
  account = {},
  onManageSeasons = null,
  notice = null,
  children,
}) {
  const theme = useTheme()
  const { t } = useI18n()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sheet, setSheet] = useState(SHEETS.none)

  const closeSheet = () => setSheet(SHEETS.none)
  const runFromSheet = (action) => () => {
    closeSheet()
    action?.()
  }

  const shortcutBindings = useMemo(
    () => [
      ...navItems
        .filter((item) => item.shortcut && !item.disabled)
        .map((item) => ({ shortcut: item.shortcut, run: () => onNavChange(item.id) })),
      ...[...createActions, ...(extraGroup?.items || [])]
        .filter((item) => item.shortcut)
        .map((item) => ({ shortcut: item.shortcut, run: item.onClick })),
    ],
    [navItems, createActions, extraGroup, onNavChange]
  )

  useShellShortcuts({
    bindings: shortcutBindings,
    onCommandPalette: () => setPaletteOpen((open) => !open),
    suspended: paletteOpen || Boolean(sheet),
  })

  const paletteItems = useMemo(() => {
    const seen = new Set()
    const unique = (item) => {
      const key = `${item.group}:${item.id}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    }
    return [
      ...createActions.map((action) => ({
        id: action.id,
        group: 'actions',
        label: action.label,
        icon: action.icon,
        shortcut: action.shortcut,
        onSelect: action.onClick,
      })),
      ...navItems
        .filter((item) => !item.disabled)
        .map((item) => ({
          id: item.id,
          group: 'sections',
          label: item.label,
          icon: item.icon,
          shortcut: item.shortcut,
          onSelect: () => onNavChange(item.id),
        })),
      ...commandItems,
    ].filter(unique)
  }, [createActions, navItems, commandItems, onNavChange])

  const accountRows = (
    <>
      <SheetRow
        icon="gear"
        label={t('shell.settings')}
        onClick={runFromSheet(account.onOpenSettings)}
        disabled={account.settingsDisabled}
      />
      <SheetRow
        icon="refresh"
        label={account.refreshLabel}
        onClick={runFromSheet(account.onRefresh)}
        disabled={account.loading}
      />
      <SheetRow
        icon="logout"
        label={account.logoutLabel}
        onClick={runFromSheet(account.onLogout)}
        tone="danger"
      />
    </>
  )

  const palette = (
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
  )

  if (isDesktop) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <ShellSidebar
          penaSwitcher={penaSwitcher}
          navItems={navItems}
          activeNavId={activeNavId}
          onNavChange={onNavChange}
          extraGroup={extraGroup}
          account={account}
        />
        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <DesktopTopbar
            title={title}
            breadcrumb={breadcrumb}
            onOpenPalette={() => setPaletteOpen(true)}
            onRefresh={account.onRefresh}
            refreshLabel={account.refreshLabel}
            loading={account.loading}
            onManageSeasons={onManageSeasons}
            primaryAction={primaryAction}
          />
          {notice}
          <ReadOnlySeasonStrip />
          <Stack useFlexGap spacing={2} sx={{ px: 3.5, pt: 3, pb: 5, maxWidth: 1440 }}>
            {children}
          </Stack>
        </Box>
        {palette}
      </Box>
    )
  }

  const navById = Object.fromEntries(navItems.map((item) => [item.id, item]))
  const bottomItems = mobileNav.map((item) => {
    if (item.kind === 'create') {
      return { ...item, variant: 'fab', popup: true, onClick: () => setSheet(SHEETS.create) }
    }
    if (item.kind === 'more') {
      return {
        ...item,
        popup: true,
        active: moreNavIds.includes(activeNavId),
        onClick: () => setSheet(SHEETS.more),
      }
    }
    const target = item.target || item.id
    return {
      ...item,
      active: target === activeNavId,
      onClick: () => {
        if (!navById[target]?.disabled) {
          onNavChange(target)
        }
      },
    }
  })

  return (
    <Box sx={{ minHeight: '100vh', width: '100%', overflowX: 'clip' }}>
      <MobileTopbar
        title={title}
        subtitle={mobileSubtitle}
        pena={penaSwitcher.pena}
        onOpenAccount={() => setSheet(SHEETS.account)}
        accountLabel={t('shell.mobile.accountMenu')}
        loading={account.loading}
      />
      {notice}
      <ReadOnlySeasonStrip />
      <Stack
        component="main"
        useFlexGap
        spacing={1.5}
        sx={{
          px: 2,
          pt: 2,
          pb: `calc(${BOTTOM_NAV_HEIGHT + 24}px + env(safe-area-inset-bottom))`,
          minWidth: 0,
        }}
      >
        {children}
      </Stack>
      <BottomNav items={bottomItems} label={t('shell.navLabel')} />

      <BottomSheet
        open={sheet === SHEETS.account}
        onClose={closeSheet}
        title={t('shell.mobile.accountMenu')}
      >
        <PenaList
          penas={penaSwitcher.penas || []}
          selectedPenaGuid={penaSwitcher.selectedPenaGuid}
          onSelectPena={(guid) => {
            closeSheet()
            penaSwitcher.onSelectPena?.(guid)
          }}
          footerActions={(penaSwitcher.footerActions || []).map((action) => ({
            ...action,
            onClick: runFromSheet(action.onClick),
          }))}
        />
        <Box sx={{ borderTop: `1px solid ${theme.custom?.shell?.line}`, my: 0.5 }} />
        {accountRows}
      </BottomSheet>

      <BottomSheet
        open={sheet === SHEETS.create}
        onClose={closeSheet}
        title={t('shell.actions.createTitle')}
      >
        {createActions.map((action) => (
          <SheetRow
            key={action.id}
            icon={action.icon}
            label={action.label}
            onClick={runFromSheet(action.onClick)}
          />
        ))}
      </BottomSheet>

      <BottomSheet open={sheet === SHEETS.more} onClose={closeSheet} title={t('shell.mobile.more')}>
        {moreNavIds
          .map((id) => navById[id])
          .filter(Boolean)
          .map((item) => (
            <SheetRow
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={item.id === activeNavId}
              disabled={item.disabled}
              onClick={runFromSheet(() => onNavChange(item.id))}
            />
          ))}
        <Box sx={{ borderTop: `1px solid ${theme.custom?.shell?.line}`, my: 0.5 }} />
        {accountRows}
      </BottomSheet>
      {palette}
    </Box>
  )
}
