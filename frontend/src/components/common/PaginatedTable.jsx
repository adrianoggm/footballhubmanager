import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'

/**
 * Generic, self-paginating table. Centralizes the duplicated TablePagination
 * wiring across admin sections.
 *
 * Props:
 *  - columns: Array<{ key, label, align?, render?(row, index) }>
 *  - rows: Array<object>
 *  - getRowKey?: (row, index) => string | number
 *  - rowsPerPageOptions?: number[] (default [10, 25, 50])
 *  - defaultRowsPerPage?: number (default 25)
 *  - emptyState?: node rendered when rows is empty
 *  - size?: 'small' | 'medium' (default 'small')
 *  - onRowClick?: (row, index) => void
 *  - labelRowsPerPage?: string
 */
export default function PaginatedTable({
  columns = [],
  rows = [],
  getRowKey,
  rowsPerPageOptions = [10, 25, 50],
  defaultRowsPerPage = 25,
  emptyState = null,
  size = 'small',
  onRowClick = null,
  labelRowsPerPage,
}) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage)

  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage))

  // Keep the active page within range when the underlying data shrinks.
  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(pageCount - 1)
    }
  }, [page, pageCount])

  const pagedRows = useMemo(() => {
    const start = page * rowsPerPage
    return rows.slice(start, start + rowsPerPage)
  }, [rows, page, rowsPerPage])

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  if (rows.length === 0 && emptyState) {
    return emptyState
  }

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer>
        <Table size={size}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align || 'left'}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRows.map((row, index) => {
              const absoluteIndex = page * rowsPerPage + index
              const key = getRowKey ? getRowKey(row, absoluteIndex) : absoluteIndex
              return (
                <TableRow
                  key={key}
                  hover={Boolean(onRowClick)}
                  onClick={onRowClick ? () => onRowClick(row, absoluteIndex) : undefined}
                  sx={onRowClick ? { cursor: 'pointer' } : undefined}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align || 'left'}>
                      {column.render ? column.render(row, absoluteIndex) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {rows.length > rowsPerPageOptions[0] ? (
        <TablePagination
          component="div"
          count={rows.length}
          page={Math.min(page, pageCount - 1)}
          onPageChange={(_, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage={labelRowsPerPage}
        />
      ) : null}
    </Box>
  )
}
