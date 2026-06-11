import { useCallback, useEffect, useRef } from 'react'

/**
 * Guards async results against stale-write races, replacing the hand-rolled
 * `requestIdRef` + `isStale()` pattern duplicated for seasonList / seasonData /
 * insights in UserDashboard.jsx.
 *
 * Each `run()` bumps an internal counter; the task receives an `isStale()` it
 * should check before committing results to state. Only the latest run is "fresh".
 * Unmounting also marks in-flight runs stale.
 *
 * Usage:
 *   const { run } = useFetchWithStaleCheck()
 *   run(async ({ isStale }) => {
 *     const data = await service.load()
 *     if (isStale()) return
 *     setData(data)
 *   })
 */
export function useFetchWithStaleCheck() {
  const requestIdRef = useRef(0)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback((task) => {
    const requestId = (requestIdRef.current += 1)
    const isStale = () => requestId !== requestIdRef.current || !mountedRef.current
    return task({ isStale, requestId })
  }, [])

  // Invalidate any in-flight run without starting a new one (e.g. on context change).
  const invalidate = useCallback(() => {
    requestIdRef.current += 1
  }, [])

  return { run, invalidate }
}
