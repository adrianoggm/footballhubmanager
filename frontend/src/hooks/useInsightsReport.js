import { useCallback, useRef, useState } from 'react'

const collectSeasonGuids = ({ scope, seasonList = [], selectedSeasonGuid = '' }) => {
  if (scope === 'all_seasons') {
    return seasonList.map((season) => season.guid).filter(Boolean)
  }
  return [selectedSeasonGuid].filter(Boolean)
}

export function useInsightsReport({ fetchInsights, onUnauthorized, onError } = {}) {
  const requestIdRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [comparisonReport, setComparisonReport] = useState(null)

  const reset = useCallback(() => {
    requestIdRef.current += 1
    setReport(null)
    setComparisonReport(null)
    setLoading(false)
  }, [])

  const refresh = useCallback(
    async ({ scope = 'selected_season', selectedSeasonGuid = '', seasonList = [] } = {}) => {
      if (!selectedSeasonGuid || typeof fetchInsights !== 'function') {
        return
      }

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setLoading(true)

      const loadScopeInsightReport = async (nextScope) => {
        const seasonGuids = collectSeasonGuids({
          scope: nextScope,
          seasonList,
          selectedSeasonGuid,
        })
        if (!seasonGuids.length) {
          return null
        }
        return fetchInsights({
          scope: nextScope,
          seasonGuids,
        })
      }

      const comparisonScope = scope === 'selected_season' ? 'all_seasons' : 'selected_season'

      try {
        const [primaryReport, secondaryReport] = await Promise.all([
          loadScopeInsightReport(scope),
          seasonList.length > 1 || comparisonScope === 'selected_season'
            ? loadScopeInsightReport(comparisonScope)
            : Promise.resolve(null),
        ])
        if (requestId !== requestIdRef.current) {
          return
        }
        setReport(primaryReport)
        setComparisonReport(secondaryReport)
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
          setLoading(false)
        }
      }
    },
    [fetchInsights, onError, onUnauthorized]
  )

  return {
    loading,
    report,
    comparisonReport,
    refresh,
    reset,
  }
}
