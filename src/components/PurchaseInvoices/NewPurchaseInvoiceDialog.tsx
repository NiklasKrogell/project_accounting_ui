import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  createFilterOptions,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  type TextFieldProps,
} from '@mui/material';
import { ApiError } from '../../api/client';
import { purchaseInvoicesApi } from '../../api/purchaseInvoices';
import { suppliersApi } from '../../api/suppliers';
import { parseAmount } from '../../lib/amount';
import { formatIban, isValidBic, isValidIban, normalizeBic, normalizeIban } from '../../lib/iban';
import { isValidPaymentReference, normalizePaymentReference } from '../../lib/paymentReference';
import type { PurchaseInvoice } from '../../types/purchaseInvoice';
import type { Supplier } from '../../types/supplier';
import { SupplierQuickDialog } from '../Suppliers/SupplierQuickDialog';
import { InvoicePdfPane } from './InvoicePdfPane';

interface NewPurchaseInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (invoice: PurchaseInvoice) => void;
}

// The new purchase invoice dialog: the invoice's details on the left and its
// PDF on the right, so the details can be read off it. There is no accounting
// here: the invoice is saved with no rows, to be coded later. The dialog
// mounts its content each time it opens, so it always starts empty.
export default function NewPurchaseInvoiceDialog({ open, onClose, onSaved }: NewPurchaseInvoiceDialogProps) {
  const { t } = useTranslation();
  // Whether anything has been entered, reported by the content: closing then
  // asks first. Null while saving, when the dialog can't be closed.
  const dirty = useRef<boolean | null>(false);

  const requestClose = () => {
    if (dirty.current === null) return;
    if (dirty.current && !window.confirm(t('purchaseInvoices.dialog.discardConfirm'))) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={requestClose}
      maxWidth="xl"
      fullWidth
      slotProps={{ paper: { sx: { height: '90vh' } } }}
    >
      <NewPurchaseInvoiceContent
        onDirtyChange={(value) => {
          dirty.current = value;
        }}
        onCancel={requestClose}
        onSaved={(invoice) => {
          dirty.current = false;
          onSaved?.(invoice);
          onClose();
        }}
      />
    </Dialog>
  );
}

// An option of the supplier picker: a supplier, or the last one, which adds a
// supplier by the name typed so far.
type SupplierOption = Supplier | { addNew: true; name: string };

const isAddNew = (option: SupplierOption): option is { addNew: true; name: string } =>
  'addNew' in option;

const filterSuppliers = createFilterOptions<Supplier>({
  stringify: (supplier) => `${supplier.name} ${supplier.businessId ?? ''}`,
});

type Field =
  | 'supplier'
  | 'invoiceNumber'
  | 'invoiceDate'
  | 'entryDate'
  | 'dueDate'
  | 'totalAmount'
  | 'paymentReference'
  | 'iban'
  | 'bic';

interface ContentProps {
  onDirtyChange: (dirty: boolean | null) => void;
  onCancel: () => void;
  onSaved: (invoice: PurchaseInvoice) => void;
}

function NewPurchaseInvoiceContent({ onDirtyChange, onCancel, onSaved }: ContentProps) {
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierInput, setSupplierInput] = useState('');
  const [quickAddName, setQuickAddName] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [entryDate, setEntryDate] = useState('');
  // The entry date follows the invoice date until it is set by hand.
  const [entryDateEdited, setEntryDateEdited] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  // What the last picked supplier filled in, so that picking another one
  // replaces it but never something typed by hand.
  const [bankPrefill, setBankPrefill] = useState({ iban: '', bic: '' });
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  // A field's error is held back until it has been left once.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    suppliersApi
      .list()
      .then((list) => {
        if (!stale) setSuppliers(list);
      })
      .catch((err) => {
        if (!stale) setError((err as Error).message);
      });
    return () => {
      stale = true;
    };
  }, []);

  const dirty =
    supplier !== null ||
    file !== null ||
    [invoiceNumber, invoiceDate, entryDate, dueDate, totalAmount, paymentReference, iban, bic, description].some(
      (value) => value.trim() !== '',
    );
  useEffect(() => {
    onDirtyChange(busy ? null : dirty);
  }, [dirty, busy, onDirtyChange]);

  const pickSupplier = (picked: Supplier | null) => {
    setSupplier(picked);
    const prefill = {
      iban: picked?.iban ? formatIban(picked.iban) : '',
      bic: picked?.bic ?? '',
    };
    if (iban.trim() === '' || iban === bankPrefill.iban) setIban(prefill.iban);
    if (bic.trim() === '' || bic === bankPrefill.bic) setBic(prefill.bic);
    setBankPrefill(prefill);
  };

  const handleSupplierCreated = (created: Supplier) => {
    setSuppliers((list) =>
      [...(list ?? []), created].sort((a, b) => a.name.localeCompare(b.name, 'fi')),
    );
    pickSupplier(created);
    setQuickAddName(null);
  };

  // Spaces may group the thousands (1 234,56).
  const totalText = totalAmount.replace(/\s/g, '');
  const amount = parseAmount(totalText);
  const normalizedReference = normalizePaymentReference(paymentReference);
  const normalizedIban = normalizeIban(iban);
  const normalizedBic = normalizeBic(bic);

  const errors: Partial<Record<Field, string>> = {};
  if (!supplier) errors.supplier = t('purchaseInvoices.dialog.required');
  if (!invoiceNumber.trim()) errors.invoiceNumber = t('purchaseInvoices.dialog.required');
  if (!invoiceDate) errors.invoiceDate = t('purchaseInvoices.dialog.required');
  if (!entryDate) errors.entryDate = t('purchaseInvoices.dialog.required');
  if (!dueDate) errors.dueDate = t('purchaseInvoices.dialog.required');
  else if (invoiceDate && dueDate < invoiceDate) {
    errors.dueDate = t('purchaseInvoices.dialog.dueBeforeInvoice');
  }
  if (!totalAmount.trim()) errors.totalAmount = t('purchaseInvoices.dialog.required');
  else if (!/^\d+([.,]\d{1,2})?$/.test(totalText) || amount === null || amount <= 0) {
    errors.totalAmount = t('purchaseInvoices.dialog.totalInvalid');
  }
  if (normalizedReference && !isValidPaymentReference(normalizedReference)) {
    errors.paymentReference = t('purchaseInvoices.dialog.referenceInvalid');
  }
  if (normalizedIban && !isValidIban(normalizedIban)) {
    errors.iban = t('purchaseInvoices.dialog.ibanInvalid');
  }
  if (normalizedBic && !isValidBic(normalizedBic)) {
    errors.bic = t('purchaseInvoices.dialog.bicInvalid');
  }
  const valid = Object.keys(errors).length === 0;

  const touch = (field: Field) => () => setTouched((v) => ({ ...v, [field]: true }));
  const shownError = (field: Field) => (touched[field] ? errors[field] : undefined);
  const fieldProps = (field: Field): TextFieldProps => ({
    onBlur: touch(field),
    error: shownError(field) !== undefined,
    helperText: shownError(field),
    fullWidth: true,
  });
  const dateProps = (field: Field): TextFieldProps => ({
    ...fieldProps(field),
    type: 'date',
    required: true,
    slotProps: { inputLabel: { shrink: true } },
  });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid || !supplier || amount === null) return;
    setBusy(true);
    setError(null);
    try {
      const invoice = await purchaseInvoicesApi.create(
        {
          supplierId: supplier.id,
          invoiceNumber: invoiceNumber.trim(),
          paymentReference: normalizedReference || null,
          invoiceDate,
          entryDate,
          dueDate,
          totalAmount: amount,
          iban: normalizedIban || null,
          bic: normalizedBic || null,
          description: description.trim(),
          // The rows come later; until then the basis is the default one.
          vatBasis: 'net',
          lines: [],
        },
        file ?? undefined,
      );
      onSaved(invoice);
    } catch (err) {
      setError(
        // Creating conflicts on one thing only: the number.
        err instanceof ApiError && err.status === 409
          ? t('purchaseInvoices.dialog.duplicateNumber', { supplier: supplier.name })
          : (err as Error).message,
      );
      setBusy(false);
    }
  }

  return (
    <>
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <DialogTitle>{t('purchaseInvoices.dialog.title')}</DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', p: 0, minHeight: 0 }}>
          <Box
            component="section"
            aria-label={t('purchaseInvoices.dialog.details')}
            sx={{
              width: 460,
              flexShrink: 0,
              overflowY: 'auto',
              p: 3,
              borderRight: 1,
              borderColor: 'divider',
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 1 }}>
              <Autocomplete<SupplierOption>
                sx={{ gridColumn: '1 / -1' }}
                options={suppliers ?? []}
                value={supplier}
                onChange={(_, picked) => {
                  if (picked && isAddNew(picked)) setQuickAddName(picked.name);
                  else pickSupplier(picked);
                }}
                inputValue={supplierInput}
                onInputChange={(_, value) => setSupplierInput(value)}
                filterOptions={(options, state) => [
                  ...filterSuppliers(options.filter((o): o is Supplier => !isAddNew(o)), state),
                  { addNew: true, name: state.inputValue.trim() },
                ]}
                getOptionLabel={(option) => option.name}
                getOptionKey={(option) => (isAddNew(option) ? 'add-new' : option.id)}
                isOptionEqualToValue={(a, b) => !isAddNew(a) && !isAddNew(b) && a.id === b.id}
                renderOption={({ key, ...props }, option) => (
                  <Box component="li" key={key} {...props}>
                    {isAddNew(option) ? (
                      <Typography color="primary">
                        {option.name
                          ? t('purchaseInvoices.dialog.addSupplierNamed', { name: option.name })
                          : t('purchaseInvoices.dialog.addSupplier')}
                      </Typography>
                    ) : (
                      <Box>
                        <Typography>{option.name}</Typography>
                        {option.businessId && (
                          <Typography variant="caption" color="text.secondary">
                            {option.businessId}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
                loading={suppliers === null}
                loadingText={t('common.loading')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    {...fieldProps('supplier')}
                    label={t('purchaseInvoices.dialog.supplier')}
                    required
                    autoFocus
                  />
                )}
              />
              <TextField
                {...fieldProps('invoiceNumber')}
                sx={{ gridColumn: '1 / -1' }}
                label={t('purchaseInvoices.dialog.invoiceNumber')}
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 50 } }}
              />
              <TextField
                {...dateProps('invoiceDate')}
                label={t('purchaseInvoices.dialog.invoiceDate')}
                value={invoiceDate}
                onChange={(e) => {
                  setInvoiceDate(e.target.value);
                  if (!entryDateEdited) setEntryDate(e.target.value);
                }}
              />
              <TextField
                {...dateProps('dueDate')}
                label={t('purchaseInvoices.dialog.dueDate')}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <TextField
                {...dateProps('entryDate')}
                label={t('purchaseInvoices.dialog.entryDate')}
                helperText={shownError('entryDate') ?? t('purchaseInvoices.dialog.entryDateHint')}
                value={entryDate}
                onChange={(e) => {
                  setEntryDate(e.target.value);
                  setEntryDateEdited(true);
                }}
              />
              <TextField
                {...fieldProps('totalAmount')}
                label={t('purchaseInvoices.dialog.totalAmount')}
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', style: { textAlign: 'right' } },
                  input: { endAdornment: <Typography color="text.secondary">€</Typography> },
                }}
              />
              <TextField
                {...fieldProps('paymentReference')}
                sx={{ gridColumn: '1 / -1' }}
                label={t('purchaseInvoices.dialog.paymentReference')}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 40, spellCheck: false } }}
              />
              <TextField
                {...fieldProps('iban')}
                sx={{ gridColumn: '1 / -1' }}
                label={t('purchaseInvoices.dialog.iban')}
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 50, autoCapitalize: 'characters', spellCheck: false } }}
              />
              <TextField
                {...fieldProps('bic')}
                label={t('purchaseInvoices.dialog.bic')}
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 11, autoCapitalize: 'characters', spellCheck: false } }}
              />
              <TextField
                sx={{ gridColumn: '1 / -1' }}
                label={t('purchaseInvoices.dialog.description')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                minRows={2}
                fullWidth
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <InvoicePdfPane file={file} onFileChange={setFile} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={busy || !valid}>
            {busy ? t('purchaseInvoices.dialog.saving') : t('purchaseInvoices.dialog.save')}
          </Button>
        </DialogActions>
      </Box>

      {/* Outside the form above, so its own form's submit stays its own. */}
      <SupplierQuickDialog
        open={quickAddName !== null}
        initialName={quickAddName ?? ''}
        onClose={() => setQuickAddName(null)}
        onCreated={handleSupplierCreated}
      />
    </>
  );
}
