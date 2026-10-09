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
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { companyUsersApi } from '../../../api/companyUsers';
import { assignableRoles, type MemberStanding } from '../../../lib/roles';
import type { Role } from '../../../types/auth';
import type { CompanyUser, CompanyUserPatch } from '../../../types/companyUser';

interface UserRoleDialogProps {
  // The member whose role is edited; null keeps the dialog closed. Only opened
  // for someone the actor may manage (canManageMember).
  target: CompanyUser | null;
  // The logged-in user's own standing in the company.
  actor: Pick<MemberStanding, 'role' | 'isAdmin'>;
  onClose: () => void;
  onSaved: () => void;
}

// Dialog for changing a member's accounting role and, for a company
// administrator, whether the member is one too. The roles on offer are the
// ones the actor may give (assignableRoles); the backend applies the same
// rules. Only what was changed is sent.
export function UserRoleDialog({ target, actor, onClose, onSaved }: UserRoleDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever the dialog is opened for someone else.
  useEffect(() => {
    if (!target) return;
    setName(`${target.firstName} ${target.lastName}`);
    setRole(target.role);
    setIsAdmin(target.isAdmin);
    setError(null);
    setBusy(false);
  }, [target]);

  const patch: CompanyUserPatch = {
    ...(target && role !== target.role && { role }),
    ...(target && actor.isAdmin && isAdmin !== target.isAdmin && { isAdmin }),
  };
  const dirty = Object.keys(patch).length > 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target || !dirty) return;
    setBusy(true);
    setError(null);
    try {
      await companyUsersApi.update(target.userId, patch);
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
        <DialogTitle>{t('usersSettings.roleDialog.title')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Typography sx={{ mb: 1 }}>{name}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label={t('usersSettings.roleDialog.role')}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              fullWidth
            >
              {assignableRoles(actor).map((option) => (
                <MenuItem key={option} value={option}>
                  {t(`roles.${option}`)}
                </MenuItem>
              ))}
            </TextField>
            {actor.isAdmin && (
              <FormControlLabel
                control={<Switch checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />}
                label={t('usersSettings.roleDialog.isAdmin')}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={busy || !dirty}>
            {busy ? t('usersSettings.roleDialog.submitting') : t('usersSettings.roleDialog.submit')}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
