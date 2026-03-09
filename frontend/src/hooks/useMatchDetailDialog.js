import { useCallback, useRef, useState } from 'react'

export function useMatchDetailDialog({ fetchDetail, onUnauthorized, onError } = {}) {
  const requestIdRef = useRef(0)
  const [matchGuid, setMatchGuid] = useState('')
  const [matchDetail, setMatchDetail] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const close = useCallback(() => {
    requestIdRef.current += 1
    setMatchGuid('')
    setMatchDetail(null)
    setIsLoading(false)
  }, [])

  const open = useCallback(
    async (nextMatchGuid) => {
      if (!nextMatchGuid || typeof fetchDetail !== 'function') {
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setMatchGuid(nextMatchGuid)
      setIsLoading(true)

      try {
        const detail = await fetchDetail(nextMatchGuid)
        if (requestId !== requestIdRef.current) {
          return
        }
        setMatchDetail(detail)
      } catch (requestError) {
        if (requestId !== requestIdRef.current) {
          return
        }
        if (requestError?.status === 401) {
          if (typeof onUnauthorized === 'function') {
            await onUnauthorized()
          }
          return
        }
        if (typeof onError === 'function') {
          onError(requestError)
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [fetchDetail, onError, onUnauthorized]
  )

  return {
    matchGuid,
    matchDetail,
    isLoading,
    open,
    close,
    reset: close,
  }
}
