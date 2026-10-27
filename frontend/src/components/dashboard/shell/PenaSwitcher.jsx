import { Box, ButtonBase, Popover, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useState } from 'react'
import { useI18n } from '../../../i18n/useI18n.js'
import ShellIcon from './ShellIcon.jsx'
import { Crest } from './shellParts.jsx'

const ellipsis = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/**
 * List of the user's peñas (selected one checked) plus footer actions such as
 * "Join a pena". Shared by the sidebar popover and the mobile account sheet.
 */
export function PenaList({ penas = [], selectedPenaGuid, onSelectPena, footerActions = [] }) {
  const theme = useTheme()
  const tones = theme.custom?.tones || {}

  const rowSx = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 1.25,
    px: 1.25,
    py: 1,
    borderRadius: '8px',
    textAlign: 'left',
    '&:hover': { bgcolor: theme.custom?.shell?.hover },
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      {penas.map((pena) => {
        const selected = pena.guid === selectedPenaGuid
        return (
          <ButtonBase
            key={pena.guid}
            aria-current={selected ? 'true' : undefined}
            onClick={() => onSelectPena?.(pena.guid)}
            sx={{ ...rowSx, bgcolor: selected ? tones.accentSoftBg : 'transparent' }}
          >
            <Crest name={pena.name} imageUrl={pena.imageUrl} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.86rem', ...ellipsis }}>
                {pena.name}
              </Typography>
              {pena.meta ? (
                <Typography sx={{ fontSize: '0.74rem', color: tones.subtle, ...ellipsis }}>
                  {pena.meta}
                </Typography>
              ) : null}
            </Box>
            {selected ? <ShellIcon name="check" size={16} /> : null}
          </ButtonBase>
        )
      })}
      {footerActions.map((action) => (
        <ButtonBase
          key={action.id}
          onClick={action.onClick}
          sx={{ ...rowSx, color: tones.subtle, fontSize: '0.85rem' }}
        >
          <ShellIcon name={action.icon || 'plus'} size={16} />
          {action.label}
        </ButtonBase>
      ))}
    </Box>
  )
}

/**
 * Sidebar peña block: crest, name and meta ("Admin · 10 players"). When
 * `switchable`, clicking opens a popover with the peña list.
 */
export default function PenaSwitcher({
  pena,
  penas = [],
  selectedPenaGuid,
  onSelectPena,
  switchable,
  footerActions = [],
}) {
  const theme = useTheme()
  const { t } = useI18n()
  const shell = theme.custom?.shell || {}
  const tones = theme.custom?.tones || {}
  const [anchor, setAnchor] = useState(null)

  const content = (
    <>
      <Crest name={pena?.name} imageUrl={pena?.imageUrl} />
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.84rem', ...ellipsis }}>
          {pena?.name}
        </Typography>
        {pena?.meta ? (
          <Typography sx={{ fontSize: '0.72rem', color: tones.subtle, ...ellipsis }}>
            {pena.meta}
          </Typography>
        ) : null}
      </Box>
      {switchable ? <ShellIcon name="chevron" size={16} /> : null}
    </>
  )

  const blockSx = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    p: 1,
    mb: 1.25,
    borderRadius: '10px',
    border: `1px solid ${shell.line}`,
    bgcolor: shell.control,
  }

  if (!switchable) {
    return <Box sx={blockSx}>{content}</Box>
  }

  return (
    <>
      <ButtonBase
        aria-label={`${t('shell.switchPena')}: ${pena?.name || ''}`}
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ ...blockSx, '&:hover': { borderColor: shell.lineStrong } }}
      >
        {content}
      </ButtonBase>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          'aria-label': t('shell.penaSwitcherTitle'),
          sx: {
            mt: 0.5,
            width: 300,
            p: 0.75,
            bgcolor: shell.popover,
            backgroundImage: 'none',
            border: `1px solid ${shell.lineStrong}`,
            borderRadius: '12px',
          },
        }}
      >
        <PenaList
          penas={penas}
          selectedPenaGuid={selectedPenaGuid}
          onSelectPena={(guid) => {
            setAnchor(null)
            onSelectPena?.(guid)
          }}
          footerActions={footerActions.map((action) => ({
            ...action,
            onClick: () => {
              setAnchor(null)
              action.onClick()
            },
          }))}
        />
      </Popover>
    </>
  )
}
