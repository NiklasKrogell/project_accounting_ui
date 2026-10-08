import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Box, Button, Card, CardActions, CardContent, Typography } from '@mui/material';

interface SettingsSectionProps {
  title: string;
  // Whether the fields differ from what is saved; Save is disabled otherwise.
  dirty: boolean;
  // Persists the fields. A rejection is shown as the section's error.
  onSave: () => Promise<void>;
  // Set when the viewer may not change the section: shown above the fields,
  // and the Save button is left out.
  readOnlyNote?: string;
  children: ReactNode;
}

// Frame shared by every section of the settings page, so they all save the
// same way: nothing is applied until Save is pressed.
export function SettingsSection({ title, dirty, onSave, readOnlyNote, children }: SettingsSectionProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await onSave();
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h4" component="h1" sx={{ mb: 2 }}>
        {title}
      </Typography>

      {readOnlyNote && (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {readOnlyNote}
        </Typography>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>{children}</CardContent>
        {!readOnlyNote && (
          <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
            <Button type="submit" variant="contained" disabled={!dirty || busy}>
              {busy ? t('settings.saving') : t('settings.save')}
            </Button>
            {saved && !dirty && (
              <Typography role="status" variant="body2" color="success.main">
                {t('settings.saved')}
              </Typography>
            )}
          </CardActions>
        )}
      </Card>
    </Box>
  );
}
