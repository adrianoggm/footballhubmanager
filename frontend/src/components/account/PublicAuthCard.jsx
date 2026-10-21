import { Box, Card, CardContent, Stack, Typography } from '@mui/material'

/** Narrow centered card used by the public account pages (recovery, verification). */
export default function PublicAuthCard({ title, subtitle, children }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', px: { xs: 1.5, md: 2.5 }, py: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="h5">{title}</Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {children}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
