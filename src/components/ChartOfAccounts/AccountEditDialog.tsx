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
  MenuItem,
  TextField,
} from '@mui/material';
import { accountsApi } from '../../api/accounts';
import type { Account, AccountGroup } from '../../types/account';
import { VAT_RATES, formatVatRate } from '../../lib/vat';

interface AccountEditDialogProps {
  // The account being edited; null keeps the dialog closed.
  account: Account | null;
  // The company's groups, in chart order, for the group select.
  groups: AccountGroup[];
  // Whether the company books VAT; when it doesn't, the default VAT rate
  // can't be changed.
  vatRegistered: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// Edit dialog for a single account: its name, the group it belongs to and its
// default VAT rate. The group decides where the account lands on the income
// statement or balance sheet; the default VAT rate is what a journal entry
// line starts with when the account is picked for it. A company that is not
// VAT-registered books no VAT, so the rate is greyed out for it and kept as it
// is. The number is shown disabled so it's clear which account is open and
// that it is not (yet) editable. The backend's PUT replaces the whole account,
// so the untouched number — and a greyed-out VAT rate — is sent back as-is.
export function AccountEditDialog({
  account,
  groups,
  vatRegistered,
  onClose,
  onSaved,
}: AccountEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState('');
  // A VAT_RATES entry as a string; '' for no default.
  const [defaultVatRate, setDefaultVatRate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever a different account is opened.
  useEffect(() => {
    if (!account) return;
    setName(account.name);
    setGroupId(account.accountGroupId ?? '');
    setDefaultVatRate(account.defaultVatRate === null ? '' : String(account.defaultVatRate));
    setError(null);
    setBusy(false);
  }, [account]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      await accountsApi.update(account.id, {
        number: account.number,
        name: name.trim(),
        accountGroupId: groupId === '' ? null : groupId,
        defaultVatRate: defaultVatRate === '' ? null : Number(defaultVatRate),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog open={account !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{t('accountEdit.title')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('accountEdit.number')}
              value={account?.number ?? ''}
              helperText={t('accountEdit.numberHint')}
              disabled
              fullWidth
            />
            <TextField
              label={t('accountEdit.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              select
              label={t('accountEdit.group')}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">{t('accountEdit.noGroup')}</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {t(`accountMainClass.${group.mainClass}`)} – {group.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t('accountEdit.defaultVat')}
              value={defaultVatRate}
              onChange={(e) => setDefaultVatRate(e.target.value)}
              helperText={t(
                vatRegistered ? 'accountEdit.defaultVatHint' : 'accountEdit.defaultVatNotRegistered',
              )}
              disabled={!vatRegistered}
              fullWidth
            >
              <MenuItem value="">{t('accountEdit.noDefaultVat')}</MenuItem>
              {VAT_RATES.map((rate) => (
                <MenuItem key={rate} value={String(rate)}>
                  {formatVatRate(rate)}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || name.trim().length === 0}>
            {busy ? t('accountEdit.submitting') : t('accountEdit.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
