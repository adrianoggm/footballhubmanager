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
import { TX_TYPES, formatLedgerDate, formatSignedMoney } from './accountabilityHelpers.js'

const ALL_TYPES = [TX_TYPES.INCOME, TX_TYPES.EXPENSE]

export default function TransactionLedger({
  t,
  formatter,
  locale,
  page,
  filter,
  onFilterChange,
  onPrev,
  onNext,
  onDelete,
  // Types the viewer can list; the filter only shows when there is a choice.
  filterTypes = ALL_TYPES,
  description,
  emptyMessage,
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
                {description || t('dashboard.admin.accountability.ledgerDescription')}
              </Typography>
            </Box>
            {filterTypes.length > 1 ? (
              <ToggleButtonGroup
                value={filter}
                exclusive
                size="small"
                onChange={(_event, next) => next !== null && onFilterChange(next)}
              >
                <ToggleButton value="all">
                  {t('dashboard.admin.accountability.filterAll')}
                </ToggleButton>
                {filterTypes.map((type) => (
                  <ToggleButton key={type} value={type}>
                    {t(`dashboard.admin.accountability.${type}`)}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            ) : null}
          </Stack>

          {!items.length ? (
            <Typography variant="body2" color="text.secondary">
              {emptyMessage || t('dashboard.admin.accountability.noTransactions')}
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
                          {formatLedgerDate(item.occurred_on, locale)}
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
