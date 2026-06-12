import { Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material'
import { translateRoleLabel } from '../../i18n/labels.js'

/**
 * "My peñas" overview + membership editing (nickname/position) and leave action.
 * Extracted from the UserDashboard monolith; state stays in the dashboard.
 */
export default function UserMembershipSection({
  anchorId,
  penas,
  selectedPenaGuid,
  selectedPena,
  membership,
  membershipForm,
  onMembershipField,
  onUpdateMembership,
  onLeavePena,
  seasonList,
  selectedSeason,
  selectedSeasonLabel,
  loading,
  t,
}) {
  return (
    <Card id={anchorId} data-sitemap-anchor>
      <CardContent>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h6">{t('dashboard.user.myPenasTitle')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.user.linkedCount', {
                count: penas.length,
                suffix: penas.length === 1 ? '' : 's',
              })}
            </Typography>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            {penas.map((pena) => (
              <Chip
                key={pena.guid}
                label={pena.name}
                color={pena.guid === selectedPenaGuid ? 'secondary' : 'default'}
                variant={pena.guid === selectedPenaGuid ? 'filled' : 'outlined'}
              />
            ))}
            {!penas.length && <Chip label={t('dashboard.user.noPenasLinked')} />}
          </Stack>

          {selectedPena && (
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {t('dashboard.user.membershipIn', { name: selectedPena.name })}
                  </Typography>
                  <TextField
                    label={t('dashboard.user.nickname')}
                    value={membershipForm.nickname}
                    onChange={onMembershipField('nickname')}
                  />
                  <TextField
                    label={t('dashboard.user.position')}
                    value={membershipForm.position}
                    onChange={onMembershipField('position')}
                  />
                  {membership?.role && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.user.role', { role: translateRoleLabel(t, membership.role) })}
                    </Typography>
                  )}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button variant="contained" onClick={onUpdateMembership} disabled={loading}>
                      {t('dashboard.user.saveMembership')}
                    </Button>
                    <Button variant="outlined" color="error" onClick={onLeavePena} disabled={loading}>
                      {t('dashboard.user.leavePena')}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t('dashboard.user.leaveHint')}
                  </Typography>

                  {!seasonList.length && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.user.noSeasonsAvailable')}
                    </Typography>
                  )}

                  {selectedSeason && (
                    <Typography variant="body2" color="text.secondary">
                      {t('dashboard.user.statsReadOnlyHint', { season: selectedSeasonLabel })}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
