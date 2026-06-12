import { createContext, useContext } from 'react'

// Shared dashboard context: exposes the current peña/season selection and the
// catalogs/handlers needed to change them. Each role dashboard still owns the
// underlying state and provides a memoized value; consumers (the context bar,
// guided empty states, and — in later phases — feature sections) read it here
// instead of receiving the selection through prop drilling.
//
// Expected value shape:
//   {
//     role: 'admin' | 'user',
//     loading: boolean,
//     penas: Array<{ guid, name }>,
//     selectedPenaGuid: string,
//     selectedPena: object | null,
//     onSelectPena: (guid: string) => void,
//     seasons: Array<{ guid, start_date, end_date }>,
//     selectedSeasonGuid: string,
//     selectedSeason: object | null,
//     activeSeason: object | null,
//     onSelectSeason: (guid: string) => void,
//     labels: { pena: string, season: string, activeSuffix?: string },
//   }
export const DashboardContext = createContext(null)

export function useDashboardContext() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardContext.Provider')
  }
  return context
}
