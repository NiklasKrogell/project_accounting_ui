import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { accountsApi } from '../../api/accounts';
import { chartOfAccountsApi } from '../../api/chartOfAccounts';
import type { Account } from '../../types/account';

interface VatAccountsDialogProps {
  open: boolean;
  onClose: () => void;
}

const accountLabel = (a: Account) => `${a.number} ${a.name}`;

// Picks the two accounts a journal entry line's VAT is posted to. Either may
// be left empty; an entry line with VAT on that side then can't be saved.
// Loads its own data on open rather than taking the page's, which only keeps
// the accounts grouped for display.
export function VatAccountsDialog({ open, onClose }: VatAccountsDialogProps) {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [receivable, setReceivable] = useState<Account | null>(null);
  const [payable, setPayable] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAccounts(null);
    setReceivable(null);
    setPayable(null);
    setError(null);
    setBusy(false);
    Promise.all([accountsApi.list(), chartOfAccountsApi.getVatAccounts()])
      .then(([accountList, vatAccounts]) => {
        const byId = (id: string | null) => accountList.find((a) => a.id === id) ?? null;
        setAccounts(accountList);
        setReceivable(byId(vatAccounts.vatReceivableAccountId));
        setPayable(byId(vatAccounts.vatPayableAccountId));
      })
      .catch((err) => setError((err as Error).message));
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await chartOfAccountsApi.setVatAccounts({
        vatReceivableAccountId: receivable?.id ?? null,
        vatPayableAccountId: payable?.id ?? null,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{t('vatAccounts.title')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('vatAccounts.hint')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Autocomplete
              options={accounts ?? []}
              value={receivable}
              onChange={(_, value) => setReceivable(value)}
              getOptionLabel={accountLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              loading={accounts === null}
              loadingText={t('common.loading')}
              renderInput={(params) => (
                <TextField {...params} label={t('vatAccounts.receivable')} fullWidth />
              )}
            />
            <Autocomplete
              options={accounts ?? []}
              value={payable}
              onChange={(_, value) => setPayable(value)}
              getOptionLabel={accountLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              loading={accounts === null}
              loadingText={t('common.loading')}
              renderInput={(params) => (
                <TextField {...params} label={t('vatAccounts.payable')} fullWidth />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || accounts === null}>
            {busy ? t('vatAccounts.submitting') : t('vatAccounts.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
