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
  Typography,
  type TextFieldProps,
} from '@mui/material';
import { useAuth } from '../../auth/AuthContext';
import { companiesApi } from '../../api/companies';
import { COMPANY_FIELD_MAX_LENGTH } from '../../lib/companyFields';
import type { CompanyInfo } from '../../types/settings';

interface CompanyCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY: CompanyInfo = {
  name: '',
  businessId: '',
  billingEmail: '',
  billingAddress: '',
  billingPostalCode: '',
  billingCity: '',
  billingCountry: '',
};

const FIELDS = Object.keys(EMPTY) as (keyof CompanyInfo)[];

// Dialog for registering a new company. Whoever registers it becomes its
// company administrator, and the backend makes it the session's active
// company; it can't be used before its subscription is paid, so what follows
// a successful save is the subscription notice for it. The fields are those of
// the company info settings, where all but the business ID can be changed
// afterwards.
export function CompanyCreateDialog({ open, onClose }: CompanyCreateDialogProps) {
  const { t } = useTranslation();
  const { refreshSession } = useAuth();
  const [form, setForm] = useState<CompanyInfo>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from an empty form every time the dialog is opened.
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setError(null);
    setBusy(false);
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const input = { ...form };
      for (const name of FIELDS) input[name] = form[name].trim();
      await companiesApi.create(input);
      // The session now has the new company as its active one.
      await refreshSession();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const incomplete = FIELDS.some((name) => form[name].trim().length === 0);

  const field = (name: keyof CompanyInfo, props: TextFieldProps = {}) => (
    <TextField
      label={t(`companyInfo.${name}`)}
      value={form[name]}
      onChange={(e) => setForm((current) => ({ ...current, [name]: e.target.value }))}
      required
      fullWidth
      slotProps={{ htmlInput: { maxLength: COMPANY_FIELD_MAX_LENGTH[name] } }}
      {...props}
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{t('companyCreate.title')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="subtitle1" component="h3">
              {t('companyInfo.basics')}
            </Typography>
            {field('name', { autoFocus: true })}
            {field('businessId')}
            <Typography variant="subtitle1" component="h3" sx={{ mt: 1 }}>
              {t('companyInfo.billing')}
            </Typography>
            {field('billingEmail', { type: 'email' })}
            {field('billingAddress')}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ width: 140, flexShrink: 0 }}>{field('billingPostalCode')}</Box>
              {field('billingCity')}
            </Box>
            {field('billingCountry')}
            <Typography variant="body2" color="text.secondary">
              {t('companyCreate.note')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || incomplete}>
            {busy ? t('companyCreate.submitting') : t('companyCreate.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
