import { useTranslation } from 'react-i18next';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import type {
  PurchaseInvoice,
  PurchaseInvoiceSortField,
  SortOrder,
} from '../../types/purchaseInvoice';
import { formatCurrency, formatDate } from '../../lib/format';
import { formatPaymentReference } from '../../lib/paymentReference';
import { PurchaseInvoiceStatusChip } from './PurchaseInvoiceStatusChip';

export interface PurchaseInvoiceSort {
  field: PurchaseInvoiceSortField;
  order: SortOrder;
}

// The columns in their order; every one of them sorts the list.
const COLUMNS: { field: PurchaseInvoiceSortField; align?: 'right' }[] = [
  { field: 'invoiceNumber' },
  { field: 'supplier' },
  { field: 'invoiceDate' },
  { field: 'dueDate' },
  { field: 'paymentReference' },
  { field: 'totalAmount', align: 'right' },
  { field: 'status' },
];

interface PurchaseInvoiceTableProps {
  // Null while the first page is loading.
  invoices: PurchaseInvoice[] | null;
  total: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  sort: PurchaseInvoiceSort;
  onSortChange: (sort: PurchaseInvoiceSort) => void;
  // Shown when the page has no invoices.
  emptyText: string;
  lang: string;
}

// The purchase invoices a page at a time, sorted by the server: a click on a
// column's header sorts by it, a second click turns the order around. The
// pagination is pinned under the rows, which scroll on their own.
export function PurchaseInvoiceTable({
  invoices,
  total,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  sort,
  onSortChange,
  emptyText,
  lang,
}: PurchaseInvoiceTableProps) {
  const { t } = useTranslation();

  const handleSort = (field: PurchaseInvoiceSortField) => {
    onSortChange(
      field === sort.field
        ? { field, order: sort.order === 'asc' ? 'desc' : 'asc' }
        : { field, order: 'asc' },
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {invoices === null ? (
          <Typography sx={{ p: 2 }}>{t('common.loading')}</Typography>
        ) : invoices.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            {emptyText}
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {COLUMNS.map(({ field, align }) => {
                    const active = sort.field === field;
                    return (
                      <TableCell
                        key={field}
                        align={align}
                        sortDirection={active ? sort.order : false}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        <TableSortLabel
                          active={active}
                          direction={active ? sort.order : 'asc'}
                          onClick={() => handleSort(field)}
                        >
                          {t(`purchaseInvoices.columns.${field}`)}
                        </TableSortLabel>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHead>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id} hover>
                    <TableCell sx={{ wordBreak: 'break-word' }}>{invoice.invoiceNumber}</TableCell>
                    <TableCell sx={{ wordBreak: 'break-word' }}>{invoice.supplier.name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(invoice.invoiceDate, lang)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(invoice.dueDate, lang)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {invoice.paymentReference ? formatPaymentReference(invoice.paymentReference) : ''}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatCurrency(invoice.totalAmount, lang)}
                    </TableCell>
                    <TableCell>
                      <PurchaseInvoiceStatusChip status={invoice.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
        rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage={t('purchaseInvoices.rowsPerPage')}
        labelDisplayedRows={({ from, to, count }) =>
          t('purchaseInvoices.displayedRows', { from, to, count })
        }
        sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}
      />
    </Box>
  );
}
