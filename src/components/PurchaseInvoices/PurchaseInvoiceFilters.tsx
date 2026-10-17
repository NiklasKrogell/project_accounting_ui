import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {
  PURCHASE_INVOICE_STATUSES,
  type PurchaseInvoiceStatus,
} from '../../types/purchaseInvoice';

// What the list is narrowed down to. Dates are 'YYYY-MM-DD' or '' for open.
export interface PurchaseInvoiceFilterValues {
  search: string;
  // Any of these; all statuses when empty.
  statuses: PurchaseInvoiceStatus[];
  invoiceDateFrom: string;
  invoiceDateTo: string;
  dueFrom: string;
  dueTo: string;
}

export const EMPTY_FILTERS: PurchaseInvoiceFilterValues = {
  search: '',
  statuses: [],
  invoiceDateFrom: '',
  invoiceDateTo: '',
  dueFrom: '',
  dueTo: '',
};

export function hasActiveFilters(values: PurchaseInvoiceFilterValues): boolean {
  return (
    values.search.trim() !== '' ||
    values.statuses.length > 0 ||
    values.invoiceDateFrom !== '' ||
    values.invoiceDateTo !== '' ||
    values.dueFrom !== '' ||
    values.dueTo !== ''
  );
}

interface PurchaseInvoiceFiltersProps {
  values: PurchaseInvoiceFilterValues;
  onChange: (values: PurchaseInvoiceFilterValues) => void;
}

type DateField = 'invoiceDateFrom' | 'invoiceDateTo' | 'dueFrom' | 'dueTo';

// The left-hand pane of the purchase invoice page: a search over the invoice
// number, the supplier, the reference and the amount, the statuses to show,
// and a range for the invoice date and for the due date. Every change is
// handed up at once; the page decides when to load.
export function PurchaseInvoiceFilters({ values, onChange }: PurchaseInvoiceFiltersProps) {
  const { t } = useTranslation();

  const toggleStatus = (status: PurchaseInvoiceStatus, checked: boolean) => {
    // Kept in the order of PURCHASE_INVOICE_STATUSES.
    const statuses = PURCHASE_INVOICE_STATUSES.filter((s) =>
      s === status ? checked : values.statuses.includes(s),
    );
    onChange({ ...values, statuses });
  };

  const dateField = (field: DateField, labelKey: string) => (
    <TextField
      type="date"
      size="small"
      fullWidth
      label={t(labelKey)}
      value={values[field]}
      onChange={(e) => onChange({ ...values, [field]: e.target.value })}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h6" component="h2">
        {t('purchaseInvoices.filters.title')}
      </Typography>

      <TextField
        type="search"
        size="small"
        fullWidth
        label={t('purchaseInvoices.filters.search')}
        helperText={t('purchaseInvoices.filters.searchHint')}
        value={values.search}
        onChange={(e) => onChange({ ...values, search: e.target.value })}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <FormControl component="fieldset">
        <FormLabel component="legend" sx={{ mb: 0.5 }}>
          {t('purchaseInvoices.filters.status')}
        </FormLabel>
        <FormGroup>
          {PURCHASE_INVOICE_STATUSES.map((status) => (
            <FormControlLabel
              key={status}
              label={t(`purchaseInvoices.status.${status}`)}
              control={
                <Checkbox
                  size="small"
                  checked={values.statuses.includes(status)}
                  onChange={(e) => toggleStatus(status, e.target.checked)}
                />
              }
            />
          ))}
        </FormGroup>
      </FormControl>

      <FormControl component="fieldset" sx={{ gap: 1.5 }}>
        <FormLabel component="legend" sx={{ mb: 1.5 }}>
          {t('purchaseInvoices.filters.invoiceDate')}
        </FormLabel>
        {dateField('invoiceDateFrom', 'purchaseInvoices.filters.from')}
        {dateField('invoiceDateTo', 'purchaseInvoices.filters.to')}
      </FormControl>

      <FormControl component="fieldset" sx={{ gap: 1.5 }}>
        <FormLabel component="legend" sx={{ mb: 1.5 }}>
          {t('purchaseInvoices.filters.dueDate')}
        </FormLabel>
        {dateField('dueFrom', 'purchaseInvoices.filters.from')}
        {dateField('dueTo', 'purchaseInvoices.filters.to')}
      </FormControl>

      <Button
        variant="outlined"
        disabled={!hasActiveFilters(values)}
        onClick={() => onChange(EMPTY_FILTERS)}
      >
        {t('purchaseInvoices.filters.clear')}
      </Button>
    </Box>
  );
}
