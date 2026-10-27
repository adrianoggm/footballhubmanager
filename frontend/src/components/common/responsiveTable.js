import { alpha } from '@mui/material/styles'

/**
 * Shared responsive-table pattern (U-05): wide tables keep scrolling
 * horizontally on narrow screens, but their last column (row actions or the key
 * result, e.g. points) stays pinned to the right edge, with a soft edge shadow
 * as the "more content" scroll affordance. Spread into a `<Table sx>`.
 * Full-width placeholder rows (`colSpan`) are left alone.
 */
export const stickyLastColumnSx = {
  '& thead th:last-of-type, & tbody td:last-of-type:not([colspan])': {
    position: 'sticky',
    right: 0,
    zIndex: 1,
    backgroundColor: 'background.paper',
    backgroundImage: 'inherit',
    boxShadow: (theme) =>
      `-8px 0 8px -8px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.7 : 0.3)}`,
  },
}
