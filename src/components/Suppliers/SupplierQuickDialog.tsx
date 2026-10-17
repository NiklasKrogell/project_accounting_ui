import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  type TextFieldProps,
} from '@mui/material';
import { ApiError } from '../../api/client';
import { suppliersApi } from '../../api/suppliers';
import {
  finnishVatNumberOf,
  isValidFinnishBusinessId,
  isValidVatNumber,
  normalizeFinnishBusinessId,
  normalizeVatNumber,
} from '../../lib/businessId';
import { isValidBic, isValidIban, normalizeBic, normalizeIban } from '../../lib/iban';
import type { Supplier } from '../../types/supplier';

interface SupplierQuickDialogProps {
  open: boolean;
  // Prefills the name: what was typed into the supplier picker.
  initialName: string;
  onClose: () => void;
  onCreated: (supplier: Supplier) => void;
}

type Field = 'name' | 'country' | 'businessId' | 'vatNumber' | 'iban' | 'bic';

// Adds a supplier from the new purchase invoice dialog with what an invoice
// shows of it: the name, the country, the business ID and VAT number, and the
// bank details, which then prefill the supplier's next invoices. The rest of
// the supplier (contact details, address, default account and VAT rate) is
// left empty. The checks mirror the backend's: a Finnish business ID has a
// check digit and gives the VAT number.
export function SupplierQuickDialog({ open, initialName, onClose, onCreated }: SupplierQuickDialogProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    country: 'FI',
    businessId: '',
    vatNumber: '',
    iban: '',
    bic: '',
  });
  // A field's error is held back until it has been left once.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues({ name: initialName, country: 'FI', businessId: '', vatNumber: '', iban: '', bic: '' });
    setTouched({});
    setBusy(false);
    setError(null);
  }, [open, initialName]);

  const country = values.country.trim().toUpperCase();
  const finnish = country === 'FI';
  const businessId = finnish
    ? normalizeFinnishBusinessId(values.businessId)
    : values.businessId.trim();
  const vatNumber = normalizeVatNumber(values.vatNumber);
  const iban = normalizeIban(values.iban);
  const bic = normalizeBic(values.bic);

  const errors: Partial<Record<Field, string>> = {};
  if (!values.name.trim()) errors.name = t('suppliers.quickDialog.nameRequired');
  if (!/^[A-Z]{2}$/.test(country)) errors.country = t('suppliers.quickDialog.countryInvalid');
  if (finnish && businessId && !isValidFinnishBusinessId(businessId)) {
    errors.businessId = t('suppliers.quickDialog.businessIdInvalid');
  }
  if (vatNumber && !isValidVatNumber(vatNumber)) {
    errors.vatNumber = t('suppliers.quickDialog.vatNumberInvalid');
  } else if (
    vatNumber &&
    finnish &&
    isValidFinnishBusinessId(businessId) &&
    vatNumber !== finnishVatNumberOf(businessId)
  ) {
    errors.vatNumber = t('suppliers.quickDialog.vatNumberMismatch', {
      expected: finnishVatNumberOf(businessId),
    });
  }
  if (iban && !isValidIban(iban)) errors.iban = t('suppliers.quickDialog.ibanInvalid');
  if (bic && !isValidBic(bic)) errors.bic = t('suppliers.quickDialog.bicInvalid');
  const valid = Object.keys(errors).length === 0;

  const shownError = (field: Field) => (touched[field] ? errors[field] : undefined);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const supplier = await suppliersApi.create({
        name: values.name.trim(),
        businessId: businessId || null,
        vatNumber: vatNumber || null,
        email: null,
        phone: null,
        streetAddress: null,
        postalCode: null,
        city: null,
        country,
        iban: iban || null,
        bic: bic || null,
        defaultAccountId: null,
        defaultVatRate: null,
      });
      onCreated(supplier);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? t('suppliers.quickDialog.duplicateBusinessId')
          : (err as Error).message,
      );
      setBusy(false);
    }
  }

  const field = (name: Field, extra: TextFieldProps = {}) => (
    <TextField
      label={t(`suppliers.quickDialog.${name}`)}
      value={values[name]}
      onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
      onBlur={() => setTouched((v) => ({ ...v, [name]: true }))}
      error={shownError(name) !== undefined}
      helperText={shownError(name)}
      fullWidth
      {...extra}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle>{t('suppliers.quickDialog.title')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {field('name', { required: true, autoFocus: true, slotProps: { htmlInput: { maxLength: 200 } } })}
            {field('country', {
              required: true,
              helperText: shownError('country') ?? t('suppliers.quickDialog.countryHint'),
              slotProps: { htmlInput: { maxLength: 2, autoCapitalize: 'characters' } },
            })}
            {field('businessId', { slotProps: { htmlInput: { maxLength: 50 } } })}
            {field('vatNumber', { slotProps: { htmlInput: { maxLength: 20, autoCapitalize: 'characters' } } })}
            {field('iban', {
              slotProps: { htmlInput: { maxLength: 50, autoCapitalize: 'characters', spellCheck: false } },
            })}
            {field('bic', { slotProps: { htmlInput: { maxLength: 11, autoCapitalize: 'characters' } } })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || !valid}>
            {busy ? t('suppliers.quickDialog.submitting') : t('suppliers.quickDialog.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
