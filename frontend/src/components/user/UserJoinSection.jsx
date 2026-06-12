import { Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'

/**
 * Join-a-pena form (invite token + optional nickname/position).
 * Extracted from the UserDashboard monolith; state stays in the dashboard.
 */
export default function UserJoinSection({ anchorId, joinForm, onJoinField, onJoin, loading, t }) {
  return (
    <Card id={anchorId} data-sitemap-anchor>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6">{t('dashboard.user.joinTitle')}</Typography>
          <TextField
            label={t('dashboard.user.inviteCode')}
            value={joinForm.token}
            onChange={onJoinField('token')}
            placeholder={t('dashboard.user.invitePlaceholder')}
          />
          <TextField
            label={t('dashboard.user.nicknameOptional')}
            value={joinForm.nickname}
            onChange={onJoinField('nickname')}
          />
          <TextField
            label={t('dashboard.user.positionOptional')}
            value={joinForm.position}
            onChange={onJoinField('position')}
          />
          <Button variant="contained" onClick={onJoin} disabled={loading}>
            {t('dashboard.user.join')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
