import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

// What a company administrator hands over to a user. No password means the
// email already had an account: its user was sent an invitation instead, and
// has nothing to be handed.
export interface IssuedCredentials {
  email: string;
  temporaryPassword: string | null;
}

interface TemporaryPasswordDialogProps {
  // null keeps the dialog closed.
  credentials: IssuedCredentials | null;
  onClose: () => void;
}

// Shows a temporary password the one time it is available: right after an
// account was created with one, or after a new one was issued. A click
// outside the dialog doesn't close it, as there is no getting the password
// back. For an existing account it only tells that the person was invited.
export function TemporaryPasswordDialog({ credentials, onClose }: TemporaryPasswordDialogProps) {
  const { t } = useTranslation();
  // Kept while the dialog fades out, then dropped.
  const [last, setLast] = useState<IssuedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!credentials) return;
    setLast(credentials);
    setCopied(false);
  }, [credentials]);

  const shown = credentials ?? last;
  const password = shown?.temporaryPassword ?? null;

  async function copy() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      // No clipboard access: the password is on screen to be copied by hand.
    }
  }

  return (
    <Dialog
      open={credentials !== null}
      onClose={(_, reason) => {
        if (reason !== 'backdropClick') onClose();
      }}
      maxWidth="xs"
      fullWidth
      slotProps={{ transition: { onExited: () => setLast(null) } }}
    >
      <DialogTitle>
        {t(password ? 'usersSettings.credentials.title' : 'usersSettings.credentials.invitedTitle')}
      </DialogTitle>
      <DialogContent>
        {password ? (
          <>
            <Typography sx={{ mb: 2 }}>{t('usersSettings.credentials.intro')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('usersSettings.credentials.email')}
                value={shown?.email ?? ''}
                fullWidth
                slotProps={{ htmlInput: { readOnly: true } }}
              />
              <TextField
                label={t('usersSettings.credentials.password')}
                value={password}
                fullWidth
                onFocus={(e) => e.target.select()}
                slotProps={{ htmlInput: { readOnly: true, style: { fontFamily: 'monospace' } } }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button variant="outlined" onClick={() => void copy()}>
                  {t('usersSettings.credentials.copy')}
                </Button>
                {copied && (
                  <Typography role="status" variant="body2" color="success.main">
                    {t('usersSettings.credentials.copied')}
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        ) : (
          <Typography>
            {t('usersSettings.credentials.invitedBody', { email: shown?.email ?? '' })}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onClose}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
