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
} from '@mui/material';
import { accountsApi } from '../../api/accounts';
import type { Account } from '../../types/account';

interface AccountEditDialogProps {
  // The account being edited; null keeps the dialog closed.
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}

// Edit dialog for a single account. Only the name is editable for now — the
// number is shown disabled so it's clear which account is open and which field
// is (not yet) editable. The backend's PUT replaces the whole account, so the
// untouched number and group are sent back as-is.
export function AccountEditDialog({ account, onClose, onSaved }: AccountEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever a different account is opened.
  useEffect(() => {
    if (!account) return;
    setName(account.name);
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
        accountGroupId: account.accountGroupId,
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
