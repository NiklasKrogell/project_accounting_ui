import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Card, CardContent, TextField, Typography } from '@mui/material';
import { useAuth } from '../../auth/AuthContext';

const MIN_LENGTH = 10; // mirrors the backend's passwordSchema

// Shown in place of the app to a user whose account was created with a
// temporary password: they set a password of their own before anything else.
// The new password is asked twice, since a typo here would lock them out.
export function ChangePasswordForm() {
  const { t } = useTranslation();
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  // The mismatch error is held back until the field has been left once.
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const matches = newPassword === confirmation;
  const showMismatch = confirmationTouched && confirmation.length > 0 && !matches;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!matches) return;
    setBusy(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card sx={{ width: '100%', maxWidth: 420 }}>
      <CardContent>
        <Typography variant="h5" component="h1" gutterBottom>
          {t('auth.changePassword.title')}
        </Typography>
        <Typography sx={{ mb: 2 }}>{t('auth.changePassword.intro')}</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            type="password"
            label={t('auth.changePassword.currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
          />
          <TextField
            type="password"
            label={t('auth.changePassword.newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            fullWidth
            slotProps={{ htmlInput: { minLength: MIN_LENGTH, autoComplete: 'new-password' } }}
          />
          <TextField
            type="password"
            label={t('auth.changePassword.confirmation')}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            onBlur={() => setConfirmationTouched(true)}
            required
            fullWidth
            error={showMismatch}
            helperText={showMismatch ? t('auth.changePassword.mismatch') : undefined}
            slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            disabled={busy || newPassword.length < MIN_LENGTH || !matches}
          >
            {busy ? t('auth.changePassword.submitting') : t('auth.changePassword.submit')}
          </Button>
          <Button onClick={() => void logout()}>{t('common.logout')}</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
