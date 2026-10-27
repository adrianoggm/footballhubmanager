import { Box, Skeleton, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { SkeletonSection } from '../../common/ContentSkeleton.jsx'
import { SIDEBAR_WIDTH } from './ShellSidebar.jsx'

/** Shell-shaped placeholder while a dashboard bootstraps (no full-page spinner). */
export default function DashboardShellSkeleton({ label }) {
  const theme = useTheme()
  const shell = theme.custom?.shell || {}

  return (
    <Box
      role="status"
      aria-busy="true"
      aria-label={label}
      sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          gap: 1,
          width: SIDEBAR_WIDTH,
          flex: 'none',
          px: 1.25,
          py: 1.75,
          bgcolor: shell.sidebar,
          borderRight: `1px solid ${shell.line}`,
        }}
      >
        <Skeleton width="60%" height={22} sx={{ mx: 1, mb: 1 }} />
        <Skeleton variant="rounded" height={50} sx={{ mb: 1 }} />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={30} sx={{ opacity: 0.7 }} />
        ))}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ height: 56, px: { xs: 2, md: 3.5 }, borderBottom: `1px solid ${shell.line}` }}
        >
          <Skeleton width={120} height={24} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="rounded" width={140} height={30} />
        </Stack>
        <Box sx={{ px: { xs: 2, md: 3.5 }, pt: 3 }}>
          <SkeletonSection />
        </Box>
      </Box>
    </Box>
  )
}
