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
import { costCentersApi } from '../../api/costCenters';
import type { CostCenter } from '../../types/costCenter';

// What the dialog is open for: a new cost center, or an existing one to edit.
export type CostCenterDialogTarget = { mode: 'create' } | { mode: 'edit'; costCenter: CostCenter };

interface CostCenterDialogProps {
  // null keeps the dialog closed.
  target: CostCenterDialogTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

// Create/edit dialog for a cost center.
export function CostCenterDialog({ target, onClose, onSaved }: CostCenterDialogProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever the dialog is opened for something else.
  useEffect(() => {
    if (!target) return;
    setCode(target.mode === 'edit' ? target.costCenter.code : '');
    setName(target.mode === 'edit' ? target.costCenter.name : '');
    setError(null);
    setBusy(false);
  }, [target]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    const input = { code: code.trim(), name: name.trim() };
    try {
      if (target.mode === 'edit') await costCentersApi.update(target.costCenter.id, input);
      else await costCentersApi.create(input);
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
          {t(target?.mode === 'edit' ? 'costCenters.dialog.editTitle' : 'costCenters.dialog.createTitle')}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('costCenters.dialog.code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              fullWidth
              slotProps={{ htmlInput: { maxLength: 20 } }}
            />
            <TextField
              label={t('costCenters.dialog.name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={busy || code.trim().length === 0 || name.trim().length === 0}
          >
            {busy ? t('costCenters.dialog.submitting') : t('costCenters.dialog.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
