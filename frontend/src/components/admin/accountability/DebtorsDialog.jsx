import {
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { formatMoney } from './accountabilityHelpers.js'

/**
 * Breakdown behind the "Outstanding dues" KPI: who still owes, most in debt first.
 * `debtors` is the already-filtered list of member accounts with debt > 0.
 */
export default function DebtorsDialog({ open, onClose, t, formatter, debtors }) {
  const rows = [...(debtors || [])].sort((a, b) => (b.debt_cents || 0) - (a.debt_cents || 0))
  const totalDebt = rows.reduce((sum, item) => sum + Number(item.debt_cents || 0), 0)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('dashboard.admin.accountability.debtorsTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.admin.accountability.debtorsDescription')}
          </Typography>

          {!rows.length ? (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.accountability.noDebtors')}
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dashboard.admin.accountability.member')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.accountability.paid')}</TableCell>
                    <TableCell align="right">{t('dashboard.admin.accountability.debt')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.player_guid}>
                      <TableCell>{item.player_name || item.player_guid}</TableCell>
                      <TableCell align="right">
                        {formatMoney(formatter, item.contribution_cents)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>
                        {formatMoney(formatter, item.debt_cents)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {t('dashboard.admin.accountability.debtorsTotal')}
                    </TableCell>
                    <TableCell />
                    <TableCell align="right" sx={{ color: 'error.main', fontWeight: 800 }}>
                      {formatMoney(formatter, totalDebt)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}
