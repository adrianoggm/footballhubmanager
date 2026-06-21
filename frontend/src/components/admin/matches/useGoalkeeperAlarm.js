import { useEffect, useRef, useState } from 'react'

import { playGoalkeeperAlarm } from './goalkeeperAlarm.js'

export function useGoalkeeperAlarm({
  trackingIsLive,
  goalkeeperRotationSeconds,
  displayedElapsed,
  matchGuid,
}) {
  const [rotationAlarmActive, setRotationAlarmActive] = useState(false)
  const [rotationAlarmCycle, setRotationAlarmCycle] = useState(0)
  const lastRotationCycleRef = useRef(null)
  const alarmStopRef = useRef(null)

  // Reset the cycle baseline whenever the interval, match, or live state changes.
  useEffect(() => {
    lastRotationCycleRef.current = null
  }, [goalkeeperRotationSeconds, matchGuid, trackingIsLive])

  useEffect(() => {
    if (!trackingIsLive || goalkeeperRotationSeconds <= 0) {
      return
    }
    const currentCycle = Math.floor(displayedElapsed / goalkeeperRotationSeconds)
    if (lastRotationCycleRef.current === null) {
      // First observation while live: avoid replaying an already-passed boundary.
      lastRotationCycleRef.current = currentCycle
      return
    }
    if (currentCycle > lastRotationCycleRef.current && currentCycle >= 1) {
      lastRotationCycleRef.current = currentCycle
      alarmStopRef.current?.()
      alarmStopRef.current = playGoalkeeperAlarm(5000)
      setRotationAlarmCycle(currentCycle)
      setRotationAlarmActive(true)
    }
  }, [trackingIsLive, goalkeeperRotationSeconds, displayedElapsed])

  useEffect(() => {
    if (trackingIsLive) {
      return
    }
    alarmStopRef.current?.()
    alarmStopRef.current = null
    setRotationAlarmActive(false)
  }, [trackingIsLive, matchGuid])

  useEffect(
    () => () => {
      alarmStopRef.current?.()
      alarmStopRef.current = null
    },
    []
  )

  const dismissRotationAlarm = () => {
    alarmStopRef.current?.()
    alarmStopRef.current = null
    setRotationAlarmActive(false)
  }

  return { rotationAlarmActive, rotationAlarmCycle, dismissRotationAlarm }
}
