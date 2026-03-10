import { Box, Button, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'

const normalizeGuids = (guids) =>
  Array.from(new Set((guids || []).map((guid) => String(guid || '').trim()).filter(Boolean)))

const toPlayerMap = (players, homeGuids, awayGuids) => {
  const map = new Map()
  ;(players || []).forEach((player) => {
    const guid = String(player?.guid || '').trim()
    if (!guid || map.has(guid)) {
      return
    }
    map.set(guid, {
      guid,
      label: player.label || guid,
    })
  })
  ;[...homeGuids, ...awayGuids].forEach((guid) => {
    if (!map.has(guid)) {
      map.set(guid, { guid, label: guid })
    }
  })
  return map
}

const buildZoneBackground = (zoneKey, isActive) => {
  if (isActive) {
    return 'rgba(25, 118, 210, 0.08)'
  }
  if (zoneKey === 'home') {
    return 'rgba(34, 197, 94, 0.06)'
  }
  if (zoneKey === 'away') {
    return 'rgba(245, 158, 11, 0.08)'
  }
  return 'rgba(15, 23, 42, 0.02)'
}

export default function LineupDragBuilder({
  players,
  homeGuids,
  awayGuids,
  onChange,
  availableTitle,
  homeTitle,
  awayTitle,
  helperText,
  emptyText,
  addHomeText,
  addAwayText,
  moveHomeText,
  moveAwayText,
  removeText,
  disabled = false,
}) {
  const [draggedGuid, setDraggedGuid] = useState('')
  const [dropTarget, setDropTarget] = useState('')

  const normalizedHomeGuids = useMemo(() => normalizeGuids(homeGuids), [homeGuids])
  const normalizedAwayGuids = useMemo(() => normalizeGuids(awayGuids), [awayGuids])

  const playerMap = useMemo(
    () => toPlayerMap(players, normalizedHomeGuids, normalizedAwayGuids),
    [players, normalizedHomeGuids, normalizedAwayGuids]
  )

  const assignedGuids = useMemo(
    () => new Set([...normalizedHomeGuids, ...normalizedAwayGuids]),
    [normalizedHomeGuids, normalizedAwayGuids]
  )

  const availablePlayers = useMemo(
    () => Array.from(playerMap.values()).filter((player) => !assignedGuids.has(player.guid)),
    [playerMap, assignedGuids]
  )

  const homePlayers = useMemo(
    () => normalizedHomeGuids.map((guid) => playerMap.get(guid) || { guid, label: guid }),
    [normalizedHomeGuids, playerMap]
  )

  const awayPlayers = useMemo(
    () => normalizedAwayGuids.map((guid) => playerMap.get(guid) || { guid, label: guid }),
    [normalizedAwayGuids, playerMap]
  )

  const moveGuid = (guid, target) => {
    if (!guid || disabled) {
      return
    }
    const nextHome = normalizedHomeGuids.filter((item) => item !== guid)
    const nextAway = normalizedAwayGuids.filter((item) => item !== guid)
    if (target === 'home') {
      onChange({
        homePlayerGuids: [...nextHome, guid],
        awayPlayerGuids: nextAway,
      })
      return
    }
    if (target === 'away') {
      onChange({
        homePlayerGuids: nextHome,
        awayPlayerGuids: [...nextAway, guid],
      })
      return
    }
    onChange({
      homePlayerGuids: nextHome,
      awayPlayerGuids: nextAway,
    })
  }

  const onDragStart = (event, guid) => {
    if (disabled) {
      return
    }
    event.dataTransfer.setData('text/plain', guid)
    event.dataTransfer.effectAllowed = 'move'
    setDraggedGuid(guid)
  }

  const onDragEnd = () => {
    setDraggedGuid('')
    setDropTarget('')
  }

  const onDragOverZone = (event, zoneKey) => {
    if (disabled) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropTarget(zoneKey)
  }

  const onDropZone = (event, zoneKey) => {
    event.preventDefault()
    if (disabled) {
      return
    }
    const guid = event.dataTransfer.getData('text/plain')
    moveGuid(guid, zoneKey)
    setDraggedGuid('')
    setDropTarget('')
  }

  const renderPlayerCard = (player, zoneKey) => (
    <Card
      key={`${zoneKey}-${player.guid}`}
      variant="outlined"
      draggable={!disabled}
      onDragStart={(event) => onDragStart(event, player.guid)}
      onDragEnd={onDragEnd}
      sx={{
        cursor: disabled ? 'default' : 'grab',
        opacity: draggedGuid === player.guid ? 0.55 : 1,
      }}
    >
      <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
        <Stack spacing={1}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {player.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {player.guid}
            </Typography>
          </Box>
          {!disabled && (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              {zoneKey === 'available' && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => moveGuid(player.guid, 'home')}
                  >
                    {addHomeText}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => moveGuid(player.guid, 'away')}
                  >
                    {addAwayText}
                  </Button>
                </>
              )}
              {zoneKey === 'home' && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => moveGuid(player.guid, 'away')}
                  >
                    {moveAwayText}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => moveGuid(player.guid, 'available')}
                  >
                    {removeText}
                  </Button>
                </>
              )}
              {zoneKey === 'away' && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => moveGuid(player.guid, 'home')}
                  >
                    {moveHomeText}
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => moveGuid(player.guid, 'available')}
                  >
                    {removeText}
                  </Button>
                </>
              )}
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )

  const zones = [
    { key: 'available', title: availableTitle, players: availablePlayers },
    { key: 'home', title: homeTitle, players: homePlayers },
    { key: 'away', title: awayTitle, players: awayPlayers },
  ]

  return (
    <Stack spacing={1.25}>
      {helperText && (
        <Typography variant="body2" color="text.secondary">
          {helperText}
        </Typography>
      )}
      <Grid container spacing={1.5}>
        {zones.map((zone) => {
          const isActive = dropTarget === zone.key
          return (
            <Grid key={zone.key} item xs={12} sm={zone.key === 'available' ? 12 : 6} md={4}>
              <Box
                onDragOver={(event) => onDragOverZone(event, zone.key)}
                onDrop={(event) => onDropZone(event, zone.key)}
                onDragLeave={() =>
                  setDropTarget((current) => (current === zone.key ? '' : current))
                }
                sx={{
                  border: '1px dashed',
                  borderColor: isActive ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 1.25,
                  minHeight: 220,
                  backgroundColor: buildZoneBackground(zone.key, isActive),
                  transition: 'border-color 160ms ease, background-color 160ms ease',
                }}
              >
                <Stack spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {zone.title} ({zone.players.length})
                  </Typography>
                  <Stack spacing={1}>
                    {zone.players.map((player) => renderPlayerCard(player, zone.key))}
                    {!zone.players.length && (
                      <Typography variant="body2" color="text.secondary">
                        {emptyText}
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              </Box>
            </Grid>
          )
        })}
      </Grid>
    </Stack>
  )
}
