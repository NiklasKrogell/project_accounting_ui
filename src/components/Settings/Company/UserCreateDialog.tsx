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
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { companyUsersApi } from '../../../api/companyUsers';
import { ROLE_ORDER } from '../../../lib/roles';
import type { Role } from '../../../types/auth';
import type { CompanyUserCreated } from '../../../types/companyUser';

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  // Gets what the backend answered: the new member and their temporary
  // password, which is not available again after this, or the invitation sent
  // to an email that already had an account.
  onCreated: (created: CompanyUserCreated) => void;
}

// Dialog for giving a person access to the active company. Only company
// administrators open it, and they may give any role. Whether the email
// already has an account is not known before saving: if it has, its user is
// invited rather than added, and the name entered here is not used.
export function UserCreateDialog({ open, onClose, onCreated }: UserCreateDialogProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from an empty form every time the dialog is opened.
  useEffect(() => {
    if (!open) return;
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('VIEWER');
    setIsAdmin(false);
    setError(null);
    setBusy(false);
  }, [open]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await companyUsersApi.create({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        isAdmin,
      });
      onCreated(created);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const incomplete =
    email.trim().length === 0 || firstName.trim().length === 0 || lastName.trim().length === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogTitle>{t('usersSettings.createDialog.title')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              type="email"
              label={t('usersSettings.createDialog.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              fullWidth
              slotProps={{ htmlInput: { maxLength: 254 } }}
            />
            <TextField
              label={t('usersSettings.createDialog.firstName')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label={t('usersSettings.createDialog.lastName')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              fullWidth
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              select
              label={t('usersSettings.createDialog.role')}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              fullWidth
            >
              {ROLE_ORDER.map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`roles.${option}`)}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <FormControlLabel
                control={<Switch checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />}
                label={t('usersSettings.createDialog.isAdmin')}
              />
              <FormHelperText>{t('usersSettings.createDialog.isAdminHint')}</FormHelperText>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t('usersSettings.createDialog.existingHint')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || incomplete}>
            {busy
              ? t('usersSettings.createDialog.submitting')
              : t('usersSettings.createDialog.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
