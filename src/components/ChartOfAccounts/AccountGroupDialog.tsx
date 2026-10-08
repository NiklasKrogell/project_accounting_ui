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
import { accountGroupsApi } from '../../api/accountGroups';
import type { AccountMainClass, IncomeStatementSubItem } from '../../types/account';
import { MAIN_CLASSES, subItemLabel, subItemOptions } from '../../lib/incomeStatementScheme';

// What the dialog is open for: a new group, or an existing one to edit.
export type AccountGroupDialogTarget =
  | { mode: 'create' }
  | {
      mode: 'edit';
      id: string;
      name: string;
      mainClass: AccountMainClass;
      incomeStatementSubItem: IncomeStatementSubItem | null;
    };

interface AccountGroupDialogProps {
  // null keeps the dialog closed.
  target: AccountGroupDialogTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

// Create/edit dialog for an account group. A group's main class places its
// accounts on the balance sheet or under a numbered item of the income
// statement; where that item has lettered sub-items, the group can also be
// assigned to one of them.
export function AccountGroupDialog({ target, onClose, onSaved }: AccountGroupDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [mainClass, setMainClass] = useState<AccountMainClass>('REVENUE');
  const [subItem, setSubItem] = useState<IncomeStatementSubItem | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever the dialog is opened for something else.
  useEffect(() => {
    if (!target) return;
    setName(target.mode === 'edit' ? target.name : '');
    setMainClass(target.mode === 'edit' ? target.mainClass : 'REVENUE');
    setSubItem(target.mode === 'edit' ? (target.incomeStatementSubItem ?? '') : '');
    setError(null);
    setBusy(false);
  }, [target]);

  const options = subItemOptions(mainClass);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    const input = {
      name: name.trim(),
      mainClass,
      incomeStatementSubItem: subItem === '' ? null : subItem,
    };
    try {
      if (target.mode === 'edit') await accountGroupsApi.update(target.id, input);
      else await accountGroupsApi.create(input);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Dialog open={target !== null} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>
          {t(target?.mode === 'edit' ? 'accountGroupEdit.editTitle' : 'accountGroupEdit.createTitle')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('accountGroupEdit.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              fullWidth
            />
            <TextField
              select
              label={t('accountGroupEdit.mainClass')}
              value={mainClass}
              onChange={(e) => {
                setMainClass(e.target.value as AccountMainClass);
                // A sub-item only exists under its own main class.
                setSubItem('');
              }}
              fullWidth
            >
              {MAIN_CLASSES.map((value) => (
                <MenuItem key={value} value={value}>
                  {t(`accountMainClass.${value}`)}
                </MenuItem>
              ))}
            </TextField>
            {options.length > 0 && (
              <TextField
                select
                label={t('accountGroupEdit.subItem')}
                helperText={t('accountGroupEdit.subItemHint')}
                value={subItem}
                onChange={(e) => setSubItem(e.target.value as IncomeStatementSubItem | '')}
                fullWidth
              >
                <MenuItem value="">{t('accountGroupEdit.noSubItem')}</MenuItem>
                {options.map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    {subItemLabel(option.key, t)}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || name.trim().length === 0}>
            {busy ? t('accountGroupEdit.submitting') : t('accountGroupEdit.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
