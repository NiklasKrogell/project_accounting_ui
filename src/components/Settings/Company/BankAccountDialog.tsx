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
} from '@mui/material';
import { bankAccountsApi } from '../../../api/bankAccounts';
import type { Account } from '../../../types/account';
import type { BankAccount } from '../../../types/bankAccount';
import { formatIban, isValidIban, normalizeIban } from '../../../lib/iban';

// What the dialog is open for: a new bank account, or an existing one to edit.
export type BankAccountDialogTarget = { mode: 'create' } | { mode: 'edit'; bankAccount: BankAccount };

interface BankAccountDialogProps {
  // null keeps the dialog closed.
  target: BankAccountDialogTarget | null;
  // The company's accounting accounts to pick from; null while they load.
  accounts: Account[] | null;
  onClose: () => void;
  onSaved: () => void;
}

const accountLabel = (a: Account) => `${a.number} ${a.name}`;

// Create/edit dialog for a bank account. The IBAN is checked here the same way
// the backend checks it, so a typo is pointed out at the field. Whether the
// bank account is in use is not changed here.
export function BankAccountDialog({ target, accounts, onClose, onSaved }: BankAccountDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  // The IBAN error is held back until the field has been left once.
  const [ibanTouched, setIbanTouched] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever the dialog is opened for something else.
  useEffect(() => {
    if (!target) return;
    setName(target.mode === 'edit' ? target.bankAccount.name : '');
    setIban(target.mode === 'edit' ? formatIban(target.bankAccount.iban) : '');
    setIbanTouched(false);
    setAccountId(target.mode === 'edit' ? target.bankAccount.accountId : null);
    setError(null);
    setBusy(false);
  }, [target]);

  const normalizedIban = normalizeIban(iban);
  const ibanValid = isValidIban(normalizedIban);
  const account = accounts?.find((a) => a.id === accountId) ?? null;
  // Only the accounts of the balance sheet item "Rahat ja pankkisaamiset" are
  // offered. A bank account linked to some other account before keeps showing
  // it until another one is picked.
  const accountOptions = (accounts ?? []).filter(
    (a) => a.accountGroup?.balanceSheetItem === 'CASH_AND_BANK' || a.id === accountId,
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target || !account || !ibanValid) return;
    setBusy(true);
    setError(null);
    const input = { name: name.trim(), iban: normalizedIban, accountId: account.id };
    try {
      if (target.mode === 'edit') await bankAccountsApi.update(target.bankAccount.id, input);
      else await bankAccountsApi.create(input);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const showIbanError = ibanTouched && normalizedIban.length > 0 && !ibanValid;

  return (
    <Dialog open={target !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>
          {t(
            target?.mode === 'edit'
              ? 'bankSettings.accounts.dialog.editTitle'
              : 'bankSettings.accounts.dialog.createTitle',
          )}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('bankSettings.accounts.dialog.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label={t('bankSettings.accounts.dialog.iban')}
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              onBlur={() => setIbanTouched(true)}
              required
              fullWidth
              error={showIbanError}
              helperText={showIbanError ? t('bankSettings.accounts.dialog.ibanInvalid') : undefined}
              slotProps={{ htmlInput: { maxLength: 50, autoCapitalize: 'characters', spellCheck: false } }}
            />
            <Autocomplete
              options={accountOptions}
              noOptionsText={t('bankSettings.accounts.dialog.noAccounts')}
              value={account}
              onChange={(_, picked) => setAccountId(picked?.id ?? null)}
              getOptionLabel={accountLabel}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              loading={accounts === null}
              loadingText={t('common.loading')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('bankSettings.accounts.dialog.account')}
                  helperText={t('bankSettings.accounts.dialog.accountHint')}
                  required
                  fullWidth
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || name.trim().length === 0 || !ibanValid || account === null}
          >
            {busy
              ? t('bankSettings.accounts.dialog.submitting')
              : t('bankSettings.accounts.dialog.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
