import { Box, Skeleton, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Skeletons shaped like real content (proposal §4: never a full-page
// LinearProgress). Each helper mirrors a recurring layout block.

const surfaceSx = (theme) => ({
  p: 2,
  borderRadius: '12px',
  bgcolor: theme.custom?.surfaces?.card || 'background.paper',
  border: `1px solid ${theme.custom?.shell?.line || theme.palette.divider}`,
  minWidth: 0,
})

/** Row of KPI-shaped placeholders. Props: count? (default 4). */
export function SkeletonKpis({ count = 4 }) {
  const theme = useTheme()
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: `repeat(${count}, minmax(0, 1fr))`,
        },
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Box key={index} sx={surfaceSx(theme)}>
          <Skeleton width="55%" height={14} />
          <Skeleton variant="rounded" width="40%" height={26} sx={{ mt: 1 }} />
        </Box>
      ))}
    </Box>
  )
}

/** List/table rows: avatar + two text lines + trailing value. Props: rows? (default 5). */
export function SkeletonRows({ rows = 5 }) {
  const theme = useTheme()
  return (
    <Box aria-hidden="true" sx={surfaceSx(theme)}>
      <Skeleton width="30%" height={18} sx={{ mb: 1.5 }} />
      <Stack spacing={1.5}>
        {Array.from({ length: rows }, (_, index) => (
          <Stack key={index} direction="row" spacing={1.25} alignItems="center">
            <Skeleton variant="circular" width={28} height={28} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton width={`${70 - (index % 3) * 12}%`} height={14} />
              <Skeleton width="35%" height={12} />
            </Box>
            <Skeleton variant="rounded" width={34} height={20} />
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

/** Generic section placeholder: KPI row + a list card. Used while a section loads. */
export function SkeletonSection() {
  return (
    <Stack spacing={2} role="status" aria-busy="true">
      <SkeletonKpis count={3} />
      <SkeletonRows rows={4} />
    </Stack>
  )
}
