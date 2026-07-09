import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { TX_TYPES, formatSignedMoney } from './accountabilityHelpers.js'

const formatDate = (value) => {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TransactionLedger({
  t,
  formatter,
  page,
  filter,
  onFilterChange,
  onPrev,
  onNext,
  onDelete,
  showFilter = true,
  readOnly = false,
}) {
  const items = page?.items || []
  const total = page?.total || 0
  const currentPage = page?.page || 1
  const totalPages = page?.total_pages || 0

  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
          >
            <Box>
              <Typography variant="h6">
                {t('dashboard.admin.accountability.ledgerTitle')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.admin.accountability.ledgerDescription')}
              </Typography>
            </Box>
            {showFilter ? (
              <ToggleButtonGroup
                value={filter}
                exclusive
                size="small"
                onChange={(_event, next) => next !== null && onFilterChange(next)}
              >
                <ToggleButton value="all">
                  {t('dashboard.admin.accountability.filterAll')}
                </ToggleButton>
                <ToggleButton value={TX_TYPES.INCOME}>
                  {t('dashboard.admin.accountability.income')}
                </ToggleButton>
                <ToggleButton value={TX_TYPES.EXPENSE}>
                  {t('dashboard.admin.accountability.expense')}
                </ToggleButton>
              </ToggleButtonGroup>
            ) : null}
          </Stack>

          {!items.length ? (
            <Typography variant="body2" color="text.secondary">
              {t('dashboard.admin.accountability.noTransactions')}
            </Typography>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('dashboard.admin.accountability.colDate')}</TableCell>
                    <TableCell>{t('dashboard.admin.accountability.colEntity')}</TableCell>
                    <TableCell>{t('dashboard.admin.accountability.colConcept')}</TableCell>
                    <TableCell align="right">
                      {t('dashboard.admin.accountability.colAmount')}
                    </TableCell>
                    {!readOnly ? (
                      <TableCell align="right">
                        {t('dashboard.admin.accountability.colActions')}
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const isExpense = item.type === TX_TYPES.EXPENSE
                    return (
                      <TableRow key={item.guid}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {formatDate(item.occurred_on)}
                        </TableCell>
                        <TableCell>{item.entity || item.player_name || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.concept}
                          </Typography>
                          {item.note ? (
                            <Typography variant="caption" color="text.secondary">
                              {item.note}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            whiteSpace: 'nowrap',
                            fontWeight: 700,
                            color: isExpense ? 'error.main' : 'success.main',
                          }}
                        >
                          {formatSignedMoney(formatter, item.amount_cents, item.type)}
                        </TableCell>
                        {!readOnly ? (
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              color="error"
                              aria-label={t('dashboard.admin.accountability.delete')}
                              onClick={() => onDelete(item)}
                            >
                              <Box component="span" className="material-symbols-rounded">
                                delete
                              </Box>
                            </IconButton>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ pt: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {t('dashboard.admin.accountability.ledgerCount', {
                shown: `${items.length}`,
                total: `${total}`,
              })}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" disabled={currentPage <= 1} onClick={onPrev}>
                {t('dashboard.admin.accountability.previous')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={currentPage >= totalPages}
                onClick={onNext}
              >
                {t('dashboard.admin.accountability.next')}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
