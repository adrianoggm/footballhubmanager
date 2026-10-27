import { useEffect, useState } from 'react'

const currentEpoch = () => Math.floor(Date.now() / 1000)

/**
 * Current epoch seconds, re-rendering every second while `active` is true
 * (a live clock is on screen); idle otherwise so nothing ticks needlessly.
 */
export function useNowEpoch(active) {
  const [nowEpoch, setNowEpoch] = useState(currentEpoch)

  useEffect(() => {
    if (!active) {
      return undefined
    }
    setNowEpoch(currentEpoch())
    const timerId = window.setInterval(() => setNowEpoch(currentEpoch()), 1000)
    return () => window.clearInterval(timerId)
  }, [active])

  return nowEpoch
}
