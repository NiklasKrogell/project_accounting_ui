import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { purchaseInvoicesApi } from '../api/purchaseInvoices';
import {
  EMPTY_FILTERS,
  hasActiveFilters,
  PurchaseInvoiceFilters,
  type PurchaseInvoiceFilterValues,
} from '../components/PurchaseInvoices/PurchaseInvoiceFilters';
import {
  PurchaseInvoiceTable,
  type PurchaseInvoiceSort,
} from '../components/PurchaseInvoices/PurchaseInvoiceTable';
import type { PurchaseInvoice } from '../types/purchaseInvoice';

// The newest invoices first until a column is picked.
const DEFAULT_SORT: PurchaseInvoiceSort = { field: 'invoiceDate', order: 'desc' };

// How long typing in the search may pause before the list is loaded again.
const SEARCH_DELAY_MS = 300;

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Purchase invoices (ostolaskut): the filters in a pane on the left edge and
// the company's invoices beside it, filtered, sorted and paged by the server.
// Layout gives the page the whole area under the tabs (WINDOW_FILLING_PATHS),
// so the two panes scroll on their own. Everyone with access can view.
export default function PurchaseInvoices() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { activeMembership } = useAuth();
  const companyId = activeMembership?.companyId;
  const lang = i18n.language;

  const [invoices, setInvoices] = useState<PurchaseInvoice[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<PurchaseInvoiceFilterValues>(EMPTY_FILTERS);
  const [sort, setSort] = useState<PurchaseInvoiceSort>(DEFAULT_SORT);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const search = useDebounced(filters.search, SEARCH_DELAY_MS);
  const { statuses, invoiceDateFrom, invoiceDateTo, dueFrom, dueTo } = filters;

  // Everything here belongs to the active company.
  useEffect(() => {
    setInvoices(null);
    setPage(0);
    setError(null);
  }, [companyId]);

  useEffect(() => {
    // Guards against a slow response for an earlier filter (or the previous
    // company) landing after the user has moved on.
    let stale = false;
    purchaseInvoicesApi
      .list({
        statuses,
        invoiceDateFrom: invoiceDateFrom || undefined,
        invoiceDateTo: invoiceDateTo || undefined,
        dueFrom: dueFrom || undefined,
        dueTo: dueTo || undefined,
        search: search || undefined,
        sort: sort.field,
        order: sort.order,
        take: rowsPerPage,
        skip: page * rowsPerPage,
      })
      .then(({ data, meta }) => {
        if (stale) return;
        // Past the last page, as when rows per page grew: go to the last one.
        if (data.length === 0 && meta.total > 0 && page > 0) {
          setPage(Math.ceil(meta.total / rowsPerPage) - 1);
          return;
        }
        setError(null);
        setInvoices(data);
        setTotal(meta.total);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
    // location.key changes on every navigation, so saving a new invoice from
    // the Ostot menu (which navigates here) reloads the list even when it is
    // already open.
  }, [
    location.key,
    companyId,
    statuses,
    invoiceDateFrom,
    invoiceDateTo,
    dueFrom,
    dueTo,
    search,
    sort,
    page,
    rowsPerPage,
  ]);

  // Filter and sort changes start the list from page one.
  const handleFiltersChange = (values: PurchaseInvoiceFilterValues) => {
    setFilters(values);
    setPage(0);
  };

  const handleSortChange = (value: PurchaseInvoiceSort) => {
    setSort(value);
    setPage(0);
  };

  return (
    <Box sx={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}>
      <Box
        component="aside"
        aria-label={t('purchaseInvoices.filters.title')}
        sx={{
          width: 280,
          flexShrink: 0,
          overflowY: 'auto',
          p: 2,
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <PurchaseInvoiceFilters values={filters} onChange={handleFiltersChange} />
      </Box>

      <Box
        component="section"
        aria-label={t('purchaseInvoices.title')}
        sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="h4" component="h1">
            {t('purchaseInvoices.title')}
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>

        <PurchaseInvoiceTable
          invoices={invoices}
          total={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value);
            setPage(0);
          }}
          sort={sort}
          onSortChange={handleSortChange}
          emptyText={t(
            hasActiveFilters(filters) ? 'purchaseInvoices.noMatches' : 'purchaseInvoices.empty',
          )}
          lang={lang}
        />
      </Box>
    </Box>
  );
}
